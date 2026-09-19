import React from 'react';
import { User } from '../../types';

interface RelationshipDistancePanelProps {
  currentUser: User;
  partner: User;
  onOpenLocationSettings: () => void;
}

// Great-circle distance using Haversine formula
function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export const RelationshipDistancePanel: React.FC<RelationshipDistancePanelProps> = ({
  currentUser,
  partner,
  onOpenLocationSettings,
}) => {
  const myLoc = currentUser.locationSettings;
  const partnerLoc = partner.locationSettings;

  const mySharing = myLoc?.enabled && myLoc.coordinates;
  const partnerSharing =
    partnerLoc?.enabled &&
    partnerLoc.audience !== 'off' &&
    partnerLoc.coordinates;

  if (!mySharing) {
    return (
      <div className="relationship-panel panel-unshared">
        <div className="panel-content">
          <span className="panel-icon">📍</span>
          <div className="panel-text">
            <span className="panel-title">Relationship Distance</span>
            <span className="panel-subtitle">
              Your location is off • Turn on location sharing to calculate distance with {partner.name}
            </span>
          </div>
        </div>
        <button
          type="button"
          className="btn-secondary btn-sm"
          onClick={onOpenLocationSettings}
        >
          Share Location
        </button>
      </div>
    );
  }

  if (!partnerSharing) {
    return (
      <div className="relationship-panel panel-unshared">
        <div className="panel-content">
          <span className="panel-icon">📍</span>
          <div className="panel-text">
            <span className="panel-title">Relationship Distance</span>
            <span className="panel-subtitle">
              Location not shared by {partner.name}
            </span>
          </div>
        </div>
        <span className="panel-badge-demo">Demo Data</span>
      </div>
    );
  }

  // Both users have shared their locations
  const distanceKm = calculateDistanceKm(
    myLoc.coordinates!.latitude,
    myLoc.coordinates!.longitude,
    partnerLoc.coordinates!.latitude,
    partnerLoc.coordinates!.longitude
  );
  const distanceMiles = Math.round(distanceKm * 0.621371);

  return (
    <div className="relationship-panel panel-connected">
      <div className="panel-content">
        <span className="panel-heart-icon">💖</span>
        <div className="panel-text">
          <div className="distance-highlight">
            <strong>~{distanceKm.toLocaleString()} km</strong>
            <span className="distance-miles">({distanceMiles.toLocaleString()} miles) apart</span>
          </div>
          <span className="panel-cities">
            {myLoc.coordinates!.city.replace(' (Demo)', '')} ⇄ {partnerLoc.coordinates!.city.replace(' (Demo)', '')}
          </span>
        </div>
      </div>

      <div className="panel-right-meta">
        <span className="demo-data-tag">Demo GPS Calculation</span>
        <button
          type="button"
          className="btn-link btn-change-loc"
          onClick={onOpenLocationSettings}
        >
          Settings
        </button>
      </div>
    </div>
  );
};
