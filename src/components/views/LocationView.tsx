import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { DistanceService } from '../../services/distanceService';
import { LocationSettingsModal } from '../location/LocationSettingsModal';
import { Badge } from '../common/Badge';

export const LocationView: React.FC = () => {
  const { currentUser, users, updateLocationSettings, stopLocationSharing } = useApp();
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [updatingLocation, setUpdatingLocation] = useState(false);
  const [locationFeedback, setLocationFeedback] = useState<string | null>(null);

  if (!currentUser) return null;

  const partnerId =
    currentUser.partnerId ||
    (currentUser.id === 'user-admin' ? 'user-girlfriend' : 'user-admin');
  const partner = users.find((u) => u.id === partnerId) || users[1];

  const myLoc = currentUser.locationSettings;
  const partnerLoc = partner?.locationSettings;

  const isSharedByMe = myLoc?.enabled;
  const isSharedByPartner = partnerLoc?.enabled;
  const bothShared = isSharedByMe && isSharedByPartner;

  const distanceInfo =
    bothShared && myLoc?.coordinates && partnerLoc?.coordinates
      ? DistanceService.calculateDistance(myLoc.coordinates, partnerLoc.coordinates)
      : null;

  const myCity = myLoc?.coordinates?.city || 'New York, USA';
  const partnerCity = partnerLoc?.coordinates?.city || 'Paris, France';

  // Instant 1-click browser GPS update
  const handleUpdateLiveLocation = () => {
    setUpdatingLocation(true);
    setLocationFeedback(null);

    if (!navigator.geolocation) {
      setLocationFeedback('Geolocation is not supported by this browser.');
      setUpdatingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(4));
        const lng = Number(pos.coords.longitude.toFixed(4));
        const city = `Current Location (${lat}°, ${lng}°)`;

        updateLocationSettings({
          enabled: true,
          audience: myLoc?.audience === 'off' ? 'partner' : (myLoc?.audience || 'partner'),
          duration: 'always',
          coordinates: {
            latitude: lat,
            longitude: lng,
            city,
          },
        });

        setLocationFeedback(`✓ Updated live location: ${lat}°, ${lng}°`);
        setUpdatingLocation(false);
        setTimeout(() => setLocationFeedback(null), 4500);
      },
      (err) => {
        setLocationFeedback(`⚠️ Could not retrieve GPS: ${err.message}`);
        setUpdatingLocation(false);
        setTimeout(() => setLocationFeedback(null), 4500);
      },
      { timeout: 12000, enableHighAccuracy: true }
    );
  };

  return (
    <div className="view-container location-view">
      <div className="view-header-block">
        <div className="view-title-group">
          <h2>Location & Long-Distance Hub</h2>
          <p className="view-description">
            Private, consent-driven proximity tracking between you and {partner?.name}.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-primary"
            onClick={handleUpdateLiveLocation}
            disabled={updatingLocation}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            {updatingLocation ? '📡 Locating...' : '📍 Update Live Location'}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setShowSettingsModal(true)}
          >
            ⚙️ Sharing Settings
          </button>
        </div>
      </div>

      {locationFeedback && (
        <div
          role="status"
          style={{
            marginBottom: '1rem',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            backgroundColor: locationFeedback.startsWith('✓') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${locationFeedback.startsWith('✓') ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
            color: locationFeedback.startsWith('✓') ? '#6ee7b7' : '#fca5a5',
            fontSize: '0.88rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {locationFeedback}
        </div>
      )}

      {/* Distance Display Card */}
      <div className="location-distance-hero">
        <div className="location-hero-header">
          <div className="location-status-badge">
            <span className="dot-indicator active" />
            <span>
              {bothShared
                ? 'Live Proximity Active'
                : !isSharedByMe
                ? 'Your location sharing is turned off'
                : `Waiting for ${partner?.name} to share location`}
            </span>
          </div>

          <div className="location-audience-indicator">
            <span>Audience: </span>
            <Badge
              label={
                myLoc?.audience === 'partner_and_admin'
                  ? 'Partner + Admin'
                  : myLoc?.audience === 'partner'
                  ? 'Partner Only'
                  : 'Off'
              }
              variant={myLoc?.audience === 'off' ? 'neutral' : 'primary'}
            />
          </div>
        </div>

        {bothShared && distanceInfo ? (
          <div className="distance-computed-box">
            <div className="distance-cities-row">
              <div className="city-pin-box">
                <span className="pin-icon">📍</span>
                <span className="city-title">{myCity}</span>
                <span className="city-coords">
                  {myLoc?.coordinates?.latitude.toFixed(2)}°N, {myLoc?.coordinates?.longitude.toFixed(2)}°W
                </span>
              </div>

              <div className="distance-arc-graphic">
                <div className="arc-line" />
                <div className="arc-plane">✈️</div>
                <span className="arc-flight-label">~{distanceInfo.approxFlightHours}h direct flight</span>
              </div>

              <div className="city-pin-box">
                <span className="pin-icon">📍</span>
                <span className="city-title">{partnerCity}</span>
                <span className="city-coords">
                  {partnerLoc?.coordinates?.latitude.toFixed(2)}°N, {partnerLoc?.coordinates?.longitude.toFixed(2)}°E
                </span>
              </div>
            </div>

            <div className="distance-metrics-bar">
              <div className="metric-pill">
                <span className="metric-val">{distanceInfo.formattedKm}</span>
                <span className="metric-lbl">Kilometers Apart</span>
              </div>
              <div className="metric-pill">
                <span className="metric-val">{distanceInfo.formattedMiles}</span>
                <span className="metric-lbl">Miles Apart</span>
              </div>
              <div className="metric-pill">
                <span className="metric-val">Haversine GPS</span>
                <span className="metric-lbl">Calculation Engine</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="distance-unshared-banner">
            <span className="unshared-icon">🔒</span>
            <h3>Distance Calculation Paused</h3>
            <p>
              {!isSharedByMe
                ? 'Enable location sharing in your settings to view your distance with your partner.'
                : `Your location is enabled. Waiting for ${partner?.name} to share back.`}
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-primary btn-sm"
                onClick={handleUpdateLiveLocation}
                disabled={updatingLocation}
              >
                {updatingLocation ? '📡 Locating...' : '📍 Share My Live Location'}
              </button>
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => setShowSettingsModal(true)}
              >
                Open Settings
              </button>
            </div>
          </div>
        )}

        {/* Privacy Control Footer */}
        <div className="location-privacy-actions">
          <div className="privacy-hint-box">
            <span>🛡️</span>
            <span>Circle administrators cannot see your exact GPS unless you explicitly choose "Partner + Admin".</span>
          </div>

          {isSharedByMe && (
            <button
              className="btn-danger btn-sm"
              onClick={stopLocationSharing}
            >
              🛑 Stop Sharing Now
            </button>
          )}
        </div>
      </div>

      {/* Circle Members Location Overview */}
      <div className="circle-location-overview">
        <div className="section-header">
          <h3>Circle Members Location Sharing Status</h3>
        </div>

        <div className="circle-location-table-container">
          <table className="location-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Status</th>
                <th>Audience</th>
                <th>City</th>
                <th>Admin Access</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const uLoc = u.locationSettings;
                const isSharing = uLoc?.enabled;
                const allowsAdmin = uLoc?.audience === 'partner_and_admin';

                return (
                  <tr key={u.id}>
                    <td>
                      <div className="table-user-cell">
                        <div
                          className="table-avatar"
                          style={{ backgroundColor: u.avatarBg }}
                        >
                          {u.name.charAt(0)}
                        </div>
                        <div>
                          <div className="table-user-name">{u.name}</div>
                          <div className="table-user-email">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <Badge
                        label={isSharing ? 'Sharing Active' : 'Not Sharing'}
                        variant={isSharing ? 'success' : 'neutral'}
                        size="sm"
                      />
                    </td>
                    <td>{uLoc?.audience || 'off'}</td>
                    <td>{isSharing ? uLoc?.coordinates?.city : 'Hidden'}</td>
                    <td>
                      {allowsAdmin ? (
                        <span className="text-success">✓ Consent Granted</span>
                      ) : (
                        <span className="text-muted">✕ No Admin Consent</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showSettingsModal && (
        <LocationSettingsModal onClose={() => setShowSettingsModal(false)} />
      )}
    </div>
  );
};
