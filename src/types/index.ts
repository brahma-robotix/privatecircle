/**
 * PrivateCircle TypeScript Definitions
 * Full 9/10 Product Upgrade: Private Long-Distance Relationship & Circle Space
 */

export type UserRole = 'admin' | 'member';
export type UserStatus = 'active' | 'suspended';

export type ViewType =
  | 'home'
  | 'chat'
  | 'groups'
  | 'relationship'
  | 'memories'
  | 'calendar'
  | 'calls'
  | 'location'
  | 'privacy'
  | 'settings'
  | 'admin';

export type LocationSharingAudience = 'off' | 'partner' | 'partner_and_admin';
export type LocationSharingDuration = '1h' | '8h' | '24h' | 'always';

export interface Coordinates {
  latitude: number;
  longitude: number;
  city: string;
}

export interface UserLocationSettings {
  enabled: boolean;
  audience: LocationSharingAudience;
  duration: LocationSharingDuration;
  sharedAt?: string;
  expiresAt?: string;
  coordinates?: Coordinates;
}

export interface PrivacySettings {
  whoCanContact: 'circle' | 'partner_only';
  profileVisibility: 'circle' | 'partner_only';
  onlineStatusVisibility: 'circle' | 'partner_only' | 'hidden';
  lastSeenVisibility: 'circle' | 'partner_only' | 'hidden';
  exactLocationEnabled: boolean;
  approximateLocationEnabled: boolean;
  allowedLocationUserIds: string[]; // user IDs granted permission
  externalTranslationConsent: boolean;
  automaticTranslationEnabled: boolean;
  discreetNotificationPreviews: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  avatarBg: string;
  bio?: string;
  partnerId?: string;
  relationshipStartDate?: string;
  locationSettings?: UserLocationSettings;
  privacySettings?: PrivacySettings;
}

export type InvitationStatus = 'pending' | 'approved' | 'rejected';

export interface Invitation {
  id: string;
  email: string;
  invitedBy: string;
  status: InvitationStatus;
  createdAt: string;
  code?: string;
  expiresAt?: string;
}

export interface Attachment {
  id: string;
  type: 'image' | 'video' | 'audio';
  url: string;
  name: string;
  sizeBytes?: number;
  durationSeconds?: number;
  waveform?: number[];
}

export interface MessageReplyPreview {
  id: string;
  senderName: string;
  textSnippet: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  timestamp: string;
  attachments?: Attachment[];
  reactions?: Record<string, string[]>; // emoji -> array of userIds
  replyTo?: MessageReplyPreview;
  isEdited?: boolean;
  translatedText?: string;
  originalText?: string;
}

export type ConversationType = 'direct' | 'group';

export interface Conversation {
  id: string;
  type: ConversationType;
  name: string;
  participantIds: string[];
  lastMessage?: string;
  lastMessageTimestamp?: string;
  isGroupPreview?: boolean;
  description?: string;
}

export type CallType = 'voice' | 'video';
export type CallStatus = 'outgoing' | 'incoming' | 'connected' | 'ended';

export interface ActiveCall {
  id: string;
  conversationId: string;
  partnerId: string;
  partnerName: string;
  callType: CallType;
  status: CallStatus;
  startedAt?: string;
  durationSeconds: number;
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing?: boolean;
}

export interface CallLogRecord {
  id: string;
  partnerId: string;
  partnerName: string;
  callType: CallType;
  direction: 'outgoing' | 'incoming';
  status: 'completed' | 'missed';
  durationSeconds: number;
  timestamp: string;
}

export type LocationAuditAction =
  | 'granted_admin'
  | 'revoked_admin'
  | 'started_sharing'
  | 'stopped_sharing'
  | 'viewed_by_admin';

export interface LocationAuditRecord {
  id: string;
  userId: string;
  userName: string;
  action: LocationAuditAction;
  timestamp: string;
  details: string;
}

export interface RelationshipMilestone {
  id: string;
  title: string;
  date: string;
  icon: string;
  category: 'firsts' | 'trips' | 'anniversary' | 'special';
  description: string;
}

export interface LoveNote {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
  isFavorite?: boolean;
  pinned?: boolean;
}

export interface MemoryComment {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  timestamp: string;
}

export interface MemoryItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  caption: string;
  title?: string;
  description?: string;
  locationLabel?: string;
  peopleIncluded?: string[];
  visibility?: 'private' | 'partner' | 'circle' | 'group';
  uploadedBy: string;
  uploaderName: string;
  date: string;
  album: 'All' | 'Paris Moments' | 'Trips & Dates' | 'Favorites';
  durationSeconds?: number;
  reactions?: Record<string, string[]>;
  comments?: MemoryComment[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
  description: string;
  category: 'birthday' | 'anniversary' | 'travel' | 'meeting' | 'exam' | 'reminder' | 'custom';
  reminder: 'none' | '1day' | '1week' | 'day_of';
  ownerId: string;
  ownerName: string;
  visibility: 'private' | 'partner' | 'circle' | 'group';
  isCountdown?: boolean;
}

export interface UserDeviceSession {
  id: string;
  userId: string;
  deviceName: string;
  browser: string;
  lastActive: string;
  approxLocation: string;
  isCurrent: boolean;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'chat' | 'call' | 'relationship' | 'location' | 'admin';
  timestamp: string;
  isRead: boolean;
  linkView?: ViewType;
}
