/**
 * Privacy & Security Governance Service
 * Plain-language permission enforcement, data export, and zero-leakage consent policies
 */

import { PrivacySettings, User } from '../types';

export const PrivacyService = {
  getDefaultPrivacySettings: (userId?: string): PrivacySettings => {
    const isMaya = userId === 'user-girlfriend';
    return {
      whoCanContact: 'circle',
      profileVisibility: 'circle',
      onlineStatusVisibility: 'circle',
      lastSeenVisibility: 'circle',
      exactLocationEnabled: false, // OFF by default
      approximateLocationEnabled: false, // OFF by default
      allowedLocationUserIds: isMaya ? ['user-admin'] : ['user-girlfriend'],
      externalTranslationConsent: false, // Explicit consent required for external AI
      automaticTranslationEnabled: false,
      discreetNotificationPreviews: true, // Sensitive content hidden by default
    };
  },

  /**
   * Checks whether a viewer can see the target user's location
   * Enforces: Admin CANNOT bypass user permissions.
   */
  canUserSeeLocation: (
    viewerId: string,
    viewerRole: string,
    targetUser: User
  ): { canSee: boolean; isApproximateOnly: boolean; reason: string } => {
    // If target location is completely off
    if (!targetUser.locationSettings?.enabled) {
      return { canSee: false, isApproximateOnly: false, reason: 'Location sharing is disabled by user.' };
    }

    const privacy = targetUser.privacySettings || PrivacyService.getDefaultPrivacySettings(targetUser.id);
    const audience = targetUser.locationSettings.audience;

    // Admin access check: target must have explicitly allowed partner_and_admin
    if (viewerRole === 'admin' && viewerId !== targetUser.id && viewerId !== targetUser.partnerId) {
      if (audience !== 'partner_and_admin') {
        return {
          canSee: false,
          isApproximateOnly: false,
          reason: 'Administrator location consent was NOT granted by this member.',
        };
      }
    }

    // Direct permission check
    const isPartner = targetUser.partnerId === viewerId;
    const isAllowedId = privacy.allowedLocationUserIds.includes(viewerId);

    if (isPartner || isAllowedId || (audience === 'partner_and_admin' && viewerRole === 'admin')) {
      const isApprox = !privacy.exactLocationEnabled && privacy.approximateLocationEnabled;
      return {
        canSee: true,
        isApproximateOnly: isApprox,
        reason: isApprox ? 'Approximate city-level location permitted.' : 'Exact GPS location permitted.',
      };
    }

    return { canSee: false, isApproximateOnly: false, reason: 'Viewer is not on the approved location permission list.' };
  },

  /**
   * Validates if sensitive text should be masked in notification previews
   */
  formatNotificationPreview: (
    senderName: string,
    rawText: string,
    privacySettings?: PrivacySettings
  ): string => {
    const isDiscreet = privacySettings ? privacySettings.discreetNotificationPreviews : true;
    if (isDiscreet) {
      return `New private message from ${senderName}`;
    }
    return `${senderName}: ${rawText.substring(0, 40)}`;
  },
};
