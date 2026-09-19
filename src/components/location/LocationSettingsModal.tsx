import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { LocationSharingAudience, LocationSharingDuration, Coordinates } from '../../types';

interface LocationSettingsModalProps {
  onClose: () => void;
}

const DEMO_PRESET_CITIES: Coordinates[] = [
  { city: 'New York, USA (Demo)', latitude: 40.7128, longitude: -74.006 },
  { city: 'Paris, France (Demo)', latitude: 48.8566, longitude: 2.3522 },
  { city: 'London, UK (Demo)', latitude: 51.5074, longitude: -0.1278 },
  { city: 'San Francisco, USA (Demo)', latitude: 37.7749, longitude: -122.4194 },
  { city: 'Tokyo, Japan (Demo)', latitude: 35.6762, longitude: 139.6503 },
];

export const LocationSettingsModal: React.FC<LocationSettingsModalProps> = ({
  onClose,
}) => {
  const { currentUser, updateLocationSettings, stopLocationSharing } = useApp();

  const userSettings = currentUser?.locationSettings || {
    enabled: false,
    audience: 'off',
    duration: 'always',
  };

  const [enabled, setEnabled] = useState<boolean>(userSettings.enabled);
  const [audience, setAudience] = useState<LocationSharingAudience>(
    userSettings.audience === 'off' ? 'partner' : userSettings.audience
  );
  const [duration, setDuration] = useState<LocationSharingDuration>(
    userSettings.duration || 'always'
  );
  const [selectedCoords, setSelectedCoords] = useState<Coordinates>(
    userSettings.coordinates || DEMO_PRESET_CITIES[0]
  );
  const [explicitAdminConsent, setExplicitAdminConsent] = useState<boolean>(
    userSettings.audience === 'partner_and_admin'
  );
  const [locationStatusNotice, setLocationStatusNotice] = useState<string | null>(null);

  // Explicit browser geolocation: NEVER CALLED AUTOMATICALLY ON PAGE LOAD
  const handleRequestDeviceLocation = () => {
    setLocationStatusNotice('Requesting browser location with your explicit permission...');
    if (!navigator.geolocation) {
      setLocationStatusNotice('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setSelectedCoords({
          latitude: Number(pos.coords.latitude.toFixed(4)),
          longitude: Number(pos.coords.longitude.toFixed(4)),
          city: 'My Device Location (Live GPS)',
        });
        setLocationStatusNotice('Device coordinates obtained with your consent.');
      },
      (err) => {
        setLocationStatusNotice(`Could not get location: ${err.message}. Using demo coordinates.`);
      },
      { timeout: 10000 }
    );
  };

  const handleSave = () => {
    if (!enabled) {
      stopLocationSharing();
      onClose();
      return;
    }

    // Determine final audience based on explicit admin consent
    const finalAudience: LocationSharingAudience =
      explicitAdminConsent ? 'partner_and_admin' : 'partner';

    updateLocationSettings({
      enabled: true,
      audience: finalAudience,
      duration,
      coordinates: selectedCoords,
    });

    onClose();
  };

  const handleStopSharing = () => {
    stopLocationSharing();
    setEnabled(false);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card location-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-header">
          <div>
            <h3>📍 Private Location Sharing</h3>
            <span className="modal-subtitle">
              Consent-First Privacy • Never requested automatically
            </span>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          {/* Privacy Guarantee Banner */}
          <div className="location-privacy-notice">
            <span className="notice-icon">🛡️</span>
            <div>
              <strong>Your Privacy Guarantee:</strong>
              <p>
                PrivateCircle will never silently track or collect your location. You choose exactly who sees your location and for how long.
              </p>
            </div>
          </div>

          {/* Current Status Indicator */}
          <div className="sharing-status-card">
            <div className="status-row">
              <span>Current Status:</span>
              <span
                className={`status-pill ${userSettings.enabled ? 'pill-active' : 'pill-inactive'}`}
              >
                {userSettings.enabled ? '🟢 Actively Sharing' : '⚪ Location Sharing Off'}
              </span>
            </div>
            {userSettings.enabled && (
              <div className="active-details-row">
                <small>
                  Audience:{' '}
                  <strong>
                    {userSettings.audience === 'partner_and_admin'
                      ? 'Partner & Circle Admin'
                      : 'Partner Only (Private)'}
                  </strong>{' '}
                  • Duration: <strong>{userSettings.duration}</strong>
                </small>
                {userSettings.coordinates && (
                  <small>
                    Current City: <strong>{userSettings.coordinates.city}</strong>
                  </small>
                )}
                <button
                  type="button"
                  className="btn-action btn-danger btn-stop-now"
                  onClick={handleStopSharing}
                >
                  🛑 Stop Sharing Now
                </button>
              </div>
            )}
          </div>

          {/* Toggle Sharing */}
          <div className="form-group toggle-group">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
              />
              <span className="toggle-text">
                Enable Location Sharing for Long-Distance Connection
              </span>
            </label>
          </div>

          {enabled && (
            <div className="location-configurable-options">
              {/* Audience Selector */}
              <div className="form-group">
                <label className="setting-label">Who can see your location?</label>
                <div className="radio-options-stack">
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="audience"
                      value="partner"
                      checked={!explicitAdminConsent}
                      onChange={() => {
                        setAudience('partner');
                        setExplicitAdminConsent(false);
                      }}
                    />
                    <div className="radio-text">
                      <strong>Share with Partner only (Recommended)</strong>
                      <span>
                        Only your direct messaging partner can calculate distance and see your city.
                      </span>
                    </div>
                  </label>

                  <label className="radio-option">
                    <input
                      type="radio"
                      name="audience"
                      value="partner_and_admin"
                      checked={explicitAdminConsent}
                      onChange={() => {
                        setAudience('partner_and_admin');
                        setExplicitAdminConsent(true);
                      }}
                    />
                    <div className="radio-text">
                      <strong>Share with Partner & Circle Administrators</strong>
                      <span>
                        Allows circle admins to view your location. Requires your explicit consent.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Explicit Admin Consent Checkbox */}
              {explicitAdminConsent && (
                <div className="admin-consent-box">
                  <label className="consent-checkbox-label">
                    <input
                      type="checkbox"
                      checked={explicitAdminConsent}
                      onChange={(e) => setExplicitAdminConsent(e.target.checked)}
                    />
                    <span>
                      <strong>I explicitly grant permission</strong> for Circle Administrators to view my location. An audit entry will be logged.
                    </span>
                  </label>
                </div>
              )}

              {/* Temporary Duration */}
              <div className="form-group">
                <label className="setting-label">Temporary Sharing Duration:</label>
                <select
                  value={duration}
                  onChange={(e) =>
                    setDuration(e.target.value as LocationSharingDuration)
                  }
                  className="select-input"
                >
                  <option value="1h">1 Hour (Temporary)</option>
                  <option value="8h">8 Hours (Work / Day trip)</option>
                  <option value="24h">24 Hours (Full day)</option>
                  <option value="always">Until I Turn It Off</option>
                </select>
              </div>

              {/* Location Coordinates Source */}
              <div className="form-group">
                <label className="setting-label">
                  Demo City Preset or Live Device GPS:
                </label>
                <div className="coord-buttons-grid">
                  {DEMO_PRESET_CITIES.map((cityCoord) => (
                    <button
                      key={cityCoord.city}
                      type="button"
                      className={`btn-secondary btn-sm ${selectedCoords.city === cityCoord.city ? 'btn-active-preset' : ''}`}
                      onClick={() => setSelectedCoords(cityCoord)}
                    >
                      {cityCoord.city}
                    </button>
                  ))}
                </div>

                <div className="device-gps-action">
                  <button
                    type="button"
                    className="btn-action btn-secondary"
                    onClick={handleRequestDeviceLocation}
                  >
                    📡 Request Device GPS (Explicit Consent)
                  </button>
                  {locationStatusNotice && (
                    <span className="notice-subtext">{locationStatusNotice}</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleSave}>
            Save Location Settings
          </button>
        </div>
      </div>
    </div>
  );
};
