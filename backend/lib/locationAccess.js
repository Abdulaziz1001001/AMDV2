const Location = require('../models/Location');
const Project = require('../models/Project');
const { haversineDistanceMeters } = require('./geo');

/**
 * Match semantics of employee map (/me-data): allowedGroups, legacy groupId, or open.
 */
function locationVisibleForEmployee(loc, empGroupIdStr) {
  const ag = loc.allowedGroups;
  if (ag && ag.length > 0) {
    if (!empGroupIdStr) return false;
    return ag.some((id) => String(id) === empGroupIdStr);
  }
  if (loc.groupId != null && loc.groupId !== '') {
    return empGroupIdStr && String(loc.groupId) === empGroupIdStr;
  }
  return true;
}

/**
 * allowedGroups non-empty → employee must be in one of them.
 * allowedGroups empty + legacy groupId → must match that group.
 * Otherwise open to all.
 */
function isEmployeeAllowedAtSite(siteDoc, empGroupId, kind) {
  const ag = siteDoc.allowedGroups;
  if (ag && ag.length > 0) {
    if (!empGroupId) return false;
    return ag.some((id) => String(id) === String(empGroupId));
  }
  if (siteDoc.groupId != null && siteDoc.groupId !== '') {
    return empGroupId && String(siteDoc.groupId) === String(empGroupId);
  }
  return true;
}

/**
 * Locations visible to employee + active projects they may use for attendance.
 */
async function getAuthorizedWorkSites(emp) {
  const gid = emp.groupId != null ? String(emp.groupId) : '';
  const allLocs = await Location.find({ lat: { $exists: true }, lng: { $exists: true } });
  const locations = allLocs.filter((loc) => locationVisibleForEmployee(loc, gid));

  const activeProjects = await Project.find({ status: 'active', lat: { $exists: true }, lng: { $exists: true } });
  const projects = activeProjects.filter((p) => isEmployeeAllowedAtSite(p, emp.groupId, 'project'));

  return { locations, projects };
}

function hasLatLng(site) {
  return site.lat != null && site.lng != null && Number.isFinite(Number(site.lat)) && Number.isFinite(Number(site.lng));
}

/** True if point is inside at least one authorized geofence (Haversine ≤ radius). */
function isInsideAnyAuthorizedGeofence(lat, lng, locations, projects) {
  const la = Number(lat);
  const ln = Number(lng);
  for (const loc of locations) {
    if (!hasLatLng(loc)) continue;
    const dist = haversineDistanceMeters(la, ln, loc.lat, loc.lng);
    const radius = loc.radius || 500;
    if (dist <= radius) return true;
  }
  for (const p of projects) {
    if (!hasLatLng(p)) continue;
    const dist = haversineDistanceMeters(la, ln, p.lat, p.lng);
    const radius = p.radius || 500;
    if (dist <= radius) return true;
  }
  return false;
}

/**
 * Closest site among authorized lists that contains the point; tie distance → prefer Location.
 */
function resolveClosestAuthorizedSite(lat, lng, locations, projects) {
  const la = Number(lat);
  const ln = Number(lng);
  let bestLoc = null;
  let bestLocDist = Infinity;
  for (const loc of locations) {
    if (!hasLatLng(loc)) continue;
    const dist = haversineDistanceMeters(la, ln, loc.lat, loc.lng);
    const radius = loc.radius || 500;
    if (dist <= radius && dist < bestLocDist) {
      bestLoc = loc;
      bestLocDist = dist;
    }
  }

  let bestProj = null;
  let bestProjDist = Infinity;
  for (const p of projects) {
    if (!hasLatLng(p)) continue;
    const dist = haversineDistanceMeters(la, ln, p.lat, p.lng);
    const radius = p.radius || 500;
    if (dist <= radius && dist < bestProjDist) {
      bestProj = p;
      bestProjDist = dist;
    }
  }

  if (!bestLoc && !bestProj) return null;
  if (!bestLoc) return { kind: 'project', doc: bestProj };
  if (!bestProj) return { kind: 'location', doc: bestLoc };
  if (bestLocDist < bestProjDist) return { kind: 'location', doc: bestLoc };
  if (bestProjDist < bestLocDist) return { kind: 'project', doc: bestProj };
  return { kind: 'location', doc: bestLoc };
}

module.exports = {
  locationVisibleForEmployee,
  isEmployeeAllowedAtSite,
  getAuthorizedWorkSites,
  isInsideAnyAuthorizedGeofence,
  resolveClosestAuthorizedSite,
};
