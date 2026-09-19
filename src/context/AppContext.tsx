import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User,
  UserStatus,
  Conversation,
  Message,
  Invitation,
  ActiveCall,
  CallType,
  Attachment,
  UserLocationSettings,
  LocationAuditRecord,
  LocationAuditAction,
  ViewType,
  RelationshipMilestone,
  LoveNote,
  MemoryItem,
  CallLogRecord,
  AppNotification,
  PrivacySettings,
  CalendarEvent,
  UserDeviceSession,
} from '../types';
import {
  INITIAL_USERS,
  INITIAL_CONVERSATIONS,
  INITIAL_MESSAGES,
  INITIAL_INVITATIONS,
  INITIAL_LOCATION_AUDIT_LOG,
  INITIAL_MILESTONES,
  INITIAL_LOVE_NOTES,
  INITIAL_MEMORIES,
  INITIAL_CALL_LOGS,
  INITIAL_NOTIFICATIONS,
  INITIAL_CALENDAR_EVENTS,
} from '../data/mockData';
import { INITIAL_DEVICE_SESSIONS } from '../services/deviceSessionService';
import { TranslationService } from '../services/translationService';
import { StorageService } from '../services/storageService';
import { PrivacyService } from '../services/privacyService';
import { AuthService, mapProfileToUser } from '../services/authService';
import { AdminService } from '../services/adminService';
import { MediaStorageService } from '../services/mediaStorageService';
import { ChatService } from '../services/chatService';
import { isSupabaseConfigured, getSupabaseClient } from '../services/supabaseClient';

export interface AppState {
  currentUser: User | null;
  users: User[];
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  invitations: Invitation[];
  activeConversationId: string | null;
  currentView: ViewType;
  isMobileSidebarOpen: boolean;
  activeCall: ActiveCall | null;
  isLocationModalOpen: boolean;
  isNotificationsModalOpen: boolean;
  locationAuditLog: LocationAuditRecord[];
  milestones: RelationshipMilestone[];
  loveNotes: LoveNote[];
  memories: MemoryItem[];
  callLogs: CallLogRecord[];
  notifications: AppNotification[];
  calendarEvents: CalendarEvent[];
  deviceSessions: UserDeviceSession[];
  replyingToMessage: Message | null;
  unreadNotificationsCount: number;

  // Supabase Auth Properties & Methods
  isAuthChecking: boolean;
  authMode: 'supabase' | 'mock';
  setAuthMode: (mode: 'supabase' | 'mock') => void;
  supabaseSignIn: (email: string, password: string) => Promise<{ error: string | null }>;
  supabaseSignUp: (
    email: string,
    password: string,
    name: string,
    inviteCode?: string
  ) => Promise<{ error: string | null }>;
  supabaseSignInWithOAuth: (
    provider: 'google' | 'facebook'
  ) => Promise<{ url?: string; error: string | null }>;
  verifyInvitationCode: (
    code: string,
    email?: string
  ) => Promise<{ valid: boolean; isBootstrapAdmin?: boolean; error: string | null }>;
  supabaseSignOut: () => Promise<void>;
  supabaseResetPassword: (email: string) => Promise<{ success: boolean; error: string | null }>;

  // Navigation & Session
  login: (userId: string) => void;
  logout: () => void;
  setActiveConversationId: (id: string | null) => void;
  setCurrentView: (view: ViewType) => void;
  setIsMobileSidebarOpen: (open: boolean) => void;
  setIsLocationModalOpen: (open: boolean) => void;
  setIsNotificationsModalOpen: (open: boolean) => void;
  setReplyingToMessage: (msg: Message | null) => void;

  // Messaging Actions
  sendMessage: (
    conversationId: string,
    text: string,
    attachments?: Attachment[],
    replyTo?: Message['replyTo']
  ) => void;
  toggleReaction: (conversationId: string, messageId: string, emoji: string) => void;
  editMessage: (conversationId: string, messageId: string, newText: string) => void;
  deleteMessage: (conversationId: string, messageId: string) => void;
  translateMessage: (conversationId: string, messageId: string, targetLang?: 'en' | 'fr' | 'es') => Promise<void>;
  addMemberToGroup: (conversationId: string, userId: string) => void;

  // Calling Controls
  startCall: (
    conversationId: string,
    partnerId: string,
    partnerName: string,
    callType: CallType
  ) => void;
  acceptCall: () => void;
  endCall: () => void;
  toggleCallMute: () => void;
  toggleCallVideo: () => void;
  toggleCallScreenShare: () => void;

  // Location & Privacy
  updateLocationSettings: (settings: Partial<UserLocationSettings>) => void;
  stopLocationSharing: () => void;
  recordLocationAudit: (
    action: LocationAuditAction,
    details: string,
    targetUserId?: string,
    targetUserName?: string
  ) => void;
  privacySettings: PrivacySettings;
  updatePrivacySettings: (settings: Partial<PrivacySettings>) => void;
  revokeLocationPermissionForUser: (targetUserId: string) => void;
  revokeAllLocationPermissions: () => void;
  requestAccountDeletion: () => void;

  // Admin Controls
  approveInvitation: (id: string) => Promise<{ success: boolean; error: string | null }>;
  rejectInvitation: (id: string) => Promise<{ success: boolean; error: string | null }>;
  createInvitationCode: (email: string) => Promise<{ invitation: Invitation | null; error: string | null }>;
  toggleSuspendMember: (userId: string) => Promise<{ success: boolean; error: string | null }>;
  removeMember: (userId: string) => void;
  refreshAdminData: () => Promise<void>;

  // Media Storage
  uploadAttachment: (
    file: File | Blob,
    fileType: 'image' | 'video' | 'audio',
    options?: any
  ) => Promise<{ attachment: (Attachment & { filePath?: string }) | null; error: string | null }>;

  // Relationship Hub
  addLoveNote: (content: string) => void;
  toggleFavoriteNote: (noteId: string) => void;
  addMilestone: (
    title: string,
    date: string,
    category: RelationshipMilestone['category'],
    description: string,
    icon?: string
  ) => void;

  // Memories Vault
  addMemory: (item: Omit<MemoryItem, 'id' | 'date'>) => void;
  toggleMemoryReaction: (memoryId: string, emoji: string) => void;
  addMemoryComment: (memoryId: string, text: string) => void;
  deleteMemory: (memoryId: string) => void;

  // Calendar & Countdowns
  addCalendarEvent: (event: Omit<CalendarEvent, 'id' | 'ownerId' | 'ownerName'>) => void;
  updateCalendarEvent: (id: string, updates: Partial<CalendarEvent>) => void;
  deleteCalendarEvent: (id: string) => void;

  // Notifications
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;

  // Settings & Profile
  updateUserProfile: (profile: Partial<User>) => void;
  terminateDeviceSession: (sessionId: string) => void;
  terminateAllOtherSessions: () => void;
  resetToMockData: () => void;
}

const STORAGE_KEY = 'privatecircle_prototype_v3';

const AppContext = createContext<AppState | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const saved = StorageService.load<any>(STORAGE_KEY, null);

  const [users, setUsers] = useState<User[]>(saved?.users || INITIAL_USERS);
  const [conversations, setConversations] = useState<Conversation[]>(
    saved?.conversations || INITIAL_CONVERSATIONS
  );
  const [messages, setMessages] = useState<Record<string, Message[]>>(
    saved?.messages || INITIAL_MESSAGES
  );
  const [invitations, setInvitations] = useState<Invitation[]>(
    saved?.invitations || INITIAL_INVITATIONS
  );
  const [locationAuditLog, setLocationAuditLog] = useState<LocationAuditRecord[]>(
    saved?.locationAuditLog || INITIAL_LOCATION_AUDIT_LOG
  );
  const [milestones, setMilestones] = useState<RelationshipMilestone[]>(
    saved?.milestones || INITIAL_MILESTONES
  );
  const [loveNotes, setLoveNotes] = useState<LoveNote[]>(
    saved?.loveNotes || INITIAL_LOVE_NOTES
  );
  const [memories, setMemories] = useState<MemoryItem[]>(
    saved?.memories || INITIAL_MEMORIES
  );
  const [callLogs, setCallLogs] = useState<CallLogRecord[]>(
    saved?.callLogs || INITIAL_CALL_LOGS
  );
  const [notifications, setNotifications] = useState<AppNotification[]>(
    saved?.notifications || INITIAL_NOTIFICATIONS
  );
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>(
    saved?.calendarEvents || INITIAL_CALENDAR_EVENTS
  );
  const [deviceSessions, setDeviceSessions] = useState<UserDeviceSession[]>(
    saved?.deviceSessions || INITIAL_DEVICE_SESSIONS
  );

  const isTestEnv = import.meta.env.MODE === 'test';

  // Supabase Auth State
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(!isTestEnv);
  const [authMode, setAuthMode] = useState<'supabase' | 'mock'>(() =>
    saved?.authMode || (isTestEnv ? 'mock' : (isSupabaseConfigured() ? 'supabase' : 'mock'))
  );
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);

  const [currentUserId, setCurrentUserId] = useState<string | null>(
    saved?.currentUserId || 'user-admin'
  );
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    INITIAL_CONVERSATIONS[1]?.id || INITIAL_CONVERSATIONS[0].id // default to Maya chat
  );
  const [currentView, setCurrentView] = useState<ViewType>(() => {
    if (typeof window !== 'undefined' && window.location.search) {
      const p = new URLSearchParams(window.location.search);
      const v = p.get('view') || p.get('tab');
      if (v === 'admin' || v === 'dashboard' || p.has('dashboard')) {
        return 'admin';
      }
    }
    return saved?.currentView || 'chat';
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState<boolean>(false);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState<boolean>(false);
  const [replyingToMessage, setReplyingToMessage] = useState<Message | null>(null);

  // Calling State
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);

  const currentUser = authMode === 'supabase'
    ? supabaseUser
    : (users.find((u) => u.id === currentUserId) || null);
  const unreadNotificationsCount = notifications.filter((n) => !n.isRead).length;

  // Bootstrap Supabase Session on App Mount
  useEffect(() => {
    let isMounted = true;

    const bootstrapAuth = async () => {
      if (isTestEnv) {
        setIsAuthChecking(false);
        return;
      }
      if (isSupabaseConfigured()) {
        try {
          const { session } = await AuthService.getSession();
          if (session?.user && isMounted) {
            const profile = await AuthService.fetchProfile(session.user.id);
            if (profile && profile.status === 'suspended') {
              await AuthService.signOut();
              if (isMounted) setSupabaseUser(null);
            } else {
              const mapped = profile
                ? mapProfileToUser(profile)
                : {
                    id: session.user.id,
                    email: session.user.email || '',
                    name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Circle Member',
                    role: 'member' as const,
                    status: 'active' as const,
                    avatarBg: '#6366f1',
                  };
              if (isMounted) {
                setSupabaseUser(mapped);
                setAuthMode('supabase');
              }
            }
          }
        } catch (err) {
          console.warn('[AppContext] Session bootstrap notice:', err);
        }
      }

      if (isMounted) {
        setIsAuthChecking(false);
      }
    };

    bootstrapAuth();

    const sub = AuthService.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session?.user) {
        if (isMounted) {
          setSupabaseUser(null);
        }
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (isMounted && session.user) {
          const profile = await AuthService.fetchProfile(session.user.id);
          const mapped = profile
            ? mapProfileToUser(profile)
            : {
                id: session.user.id,
                email: session.user.email || '',
                name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Circle Member',
                role: 'member' as const,
                status: 'active' as const,
                avatarBg: '#6366f1',
              };
          setSupabaseUser(mapped);
          setAuthMode('supabase');
        }
      }
    });

    return () => {
      isMounted = false;
      sub.unsubscribe();
    };
  }, []);

  // Persist state
  useEffect(() => {
    StorageService.save(STORAGE_KEY, {
      users,
      conversations,
      messages,
      invitations,
      locationAuditLog,
      milestones,
      loveNotes,
      memories,
      callLogs,
      notifications,
      calendarEvents,
      deviceSessions,
      currentUserId,
      currentView,
      authMode,
    });
  }, [
    users,
    conversations,
    messages,
    invitations,
    locationAuditLog,
    milestones,
    loveNotes,
    memories,
    callLogs,
    notifications,
    calendarEvents,
    deviceSessions,
    currentUserId,
    currentView,
    authMode,
  ]);

  // Call duration counter
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (activeCall && activeCall.status === 'connected') {
      interval = setInterval(() => {
        setActiveCall((prev) =>
          prev ? { ...prev, durationSeconds: prev.durationSeconds + 1 } : null
        );
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeCall?.status]);

  const supabaseSignIn = async (email: string, password: string) => {
    const res = await AuthService.signIn(email, password);
    if (!res.error && res.user) {
      setSupabaseUser(res.user);
      setAuthMode('supabase');
      setCurrentView('chat');
    }
    return { error: res.error };
  };

  const supabaseSignUp = async (
    email: string,
    password: string,
    name: string,
    inviteCode?: string
  ) => {
    const res = await AuthService.signUp(email, password, name, inviteCode);
    if (!res.error && res.user && res.session) {
      setSupabaseUser(res.user);
      setAuthMode('supabase');
      setCurrentView('chat');
    }
    return { error: res.error };
  };

  const supabaseSignInWithOAuth = async (provider: 'google' | 'facebook') => {
    return await AuthService.signInWithOAuth(provider);
  };

  const verifyInvitationCode = async (code: string, email?: string) => {
    return await AuthService.verifyInvitationCode(code, email);
  };

  const supabaseSignOut = async () => {
    await AuthService.signOut();
    setSupabaseUser(null);
    setCurrentView('chat');
    setActiveConversationId(null);
    setActiveCall(null);
  };

  const supabaseResetPassword = async (email: string) => {
    return await AuthService.resetPassword(email);
  };

  // Supabase Realtime: Sync conversations when authenticated
  useEffect(() => {
    if (authMode !== 'supabase' || !currentUser) return;
    if (isTestEnv) return;

    let isMounted = true;
    ChatService.fetchConversations(currentUser.id).then(({ conversations: dbConvs, error }) => {
      if (!error && dbConvs.length > 0 && isMounted) {
        setConversations(dbConvs);
        setActiveConversationId((prev) => {
          if (!prev || !dbConvs.some((c) => c.id === prev)) {
            return dbConvs[0].id;
          }
          return prev;
        });
      }
    });

    return () => {
      isMounted = false;
    };
  }, [authMode, currentUser?.id]);

  // Supabase Realtime: Sync messages and subscribe to Realtime channel for active conversation
  useEffect(() => {
    if (authMode !== 'supabase' || !activeConversationId || !currentUser) return;
    if (isTestEnv) return;

    let isMounted = true;

    ChatService.fetchMessages(activeConversationId).then(({ messages: dbMsgs, error }) => {
      if (!error && dbMsgs && isMounted) {
        setMessages((prev) => ({
          ...prev,
          [activeConversationId]: dbMsgs,
        }));
      }
    });

    const channel = ChatService.subscribeToConversation(activeConversationId, {
      onMessageInsert: (incomingMsg) => {
        if (!isMounted) return;
        setMessages((prev) => {
          const currentList = prev[activeConversationId] || [];
          if (currentList.some((m) => m.id === incomingMsg.id)) {
            return prev;
          }
          return {
            ...prev,
            [activeConversationId]: [...currentList, incomingMsg],
          };
        });
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeConversationId
              ? {
                  ...c,
                  lastMessage:
                    incomingMsg.text ||
                    (incomingMsg.attachments?.[0]
                      ? `[Attached ${incomingMsg.attachments[0].type}]`
                      : 'New message'),
                  lastMessageTimestamp: incomingMsg.timestamp,
                }
              : c
          )
        );
      },
      onMessageUpdate: (updatedMsg) => {
        if (!isMounted) return;
        setMessages((prev) => {
          const currentList = prev[activeConversationId] || [];
          return {
            ...prev,
            [activeConversationId]: currentList.map((m) =>
              m.id === updatedMsg.id ? { ...m, text: updatedMsg.text, isEdited: true } : m
            ),
          };
        });
      },
      onMessageDelete: (deletedId) => {
        if (!isMounted) return;
        setMessages((prev) => {
          const currentList = prev[activeConversationId] || [];
          return {
            ...prev,
            [activeConversationId]: currentList.filter((m) => m.id !== deletedId),
          };
        });
      },
      onReactionChange: () => {
        if (!isMounted) return;
        ChatService.fetchMessages(activeConversationId).then(({ messages: refreshedMsgs }) => {
          if (refreshedMsgs && isMounted) {
            setMessages((prev) => ({
              ...prev,
              [activeConversationId]: refreshedMsgs,
            }));
          }
        });
      },
    });

    return () => {
      isMounted = false;
      if (channel) {
        const client = getSupabaseClient();
        client?.removeChannel(channel);
      }
    };
  }, [authMode, activeConversationId, currentUser?.id]);

  // Supabase: Sync admin data when role is admin
  const refreshAdminData = async () => {
    if (authMode !== 'supabase') return;
    const [membersRes, invitesRes] = await Promise.all([
      AdminService.fetchCircleMembers(),
      AdminService.fetchInvitations(),
    ]);
    if (!membersRes.error && membersRes.users.length > 0) {
      setUsers(membersRes.users);
    }
    if (!invitesRes.error) {
      setInvitations(invitesRes.invitations);
    }
  };

  useEffect(() => {
    if (authMode !== 'supabase' || currentUser?.role !== 'admin') return;
    if (isTestEnv) return;

    refreshAdminData();
  }, [authMode, currentUser?.role]);

  const uploadAttachment = async (
    file: File | Blob,
    fileType: 'image' | 'video' | 'audio',
    options?: any
  ) => {
    return await MediaStorageService.uploadAttachment(file, fileType, options);
  };

  const login = (userId: string) => {
    setAuthMode('mock');
    setCurrentUserId(userId);
    setCurrentView('chat');
    setIsMobileSidebarOpen(false);
  };

  const logout = () => {
    if (authMode === 'supabase') {
      supabaseSignOut();
      return;
    }
    setCurrentUserId(null);
    setActiveConversationId(null);
    setCurrentView('chat');
    setActiveCall(null);
    setReplyingToMessage(null);
  };

  const formatCurrentTime = (): string => {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Messaging Actions
  const sendMessage = (
    conversationId: string,
    text: string,
    attachments?: Attachment[],
    replyTo?: Message['replyTo']
  ) => {
    if ((!text.trim() && (!attachments || attachments.length === 0)) || !currentUser)
      return;
    if (currentUser.status === 'suspended') return;

    const timeStr = formatCurrentTime();
    const newMessage: Message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      conversationId,
      senderId: currentUser.id,
      text: text.trim(),
      timestamp: timeStr,
      attachments: attachments && attachments.length > 0 ? attachments : undefined,
      replyTo: replyTo || (replyingToMessage ? {
        id: replyingToMessage.id,
        senderName: users.find((u) => u.id === replyingToMessage.senderId)?.name || 'User',
        textSnippet: replyingToMessage.text.substring(0, 45) + (replyingToMessage.text.length > 45 ? '...' : ''),
      } : undefined),
    };

    setMessages((prev) => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] || []), newMessage],
    }));

    // If photo or video attached, also automatically store in memories vault
    if (attachments && attachments.length > 0) {
      const isPartnerConv = conversationId === 'conv-alex-maya';
      attachments.forEach((att) => {
        if (att.type === 'image' || att.type === 'video') {
          const newMem: MemoryItem = {
            id: `mem-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
            type: att.type,
            url: att.url,
            caption: text.trim() || att.name,
            uploadedBy: currentUser.id,
            uploaderName: currentUser.name,
            date: 'Just now',
            album: isPartnerConv ? 'Paris Moments' : 'All',
            durationSeconds: att.durationSeconds,
          };
          setMemories((prev) => [newMem, ...prev]);
        }
      });
    }

    setReplyingToMessage(null);

    const previewText =
      text.trim() ||
      (attachments && attachments.length > 0
        ? `[Attached ${attachments[0].type}]`
        : 'New message');

    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId
          ? {
              ...c,
              lastMessage: previewText,
              lastMessageTimestamp: timeStr,
            }
          : c
      )
    );

    if (authMode === 'supabase') {
      const replyPreview = replyTo || (replyingToMessage ? {
        id: replyingToMessage.id,
        senderName: users.find((u) => u.id === replyingToMessage.senderId)?.name || 'User',
        textSnippet: replyingToMessage.text.substring(0, 45) + (replyingToMessage.text.length > 45 ? '...' : ''),
      } : undefined);

      ChatService.sendRealMessage(
        conversationId,
        currentUser.id,
        text,
        attachments as (Attachment & { filePath?: string })[],
        replyPreview
      ).then(({ message, error }) => {
        if (error) {
          console.warn('[AppContext] Supabase message sync warning:', error);
        } else if (message) {
          setMessages((prev) => {
            const currentList = prev[conversationId] || [];
            return {
              ...prev,
              [conversationId]: currentList.map((m) => (m.id === newMessage.id ? message : m)),
            };
          });
        }
      });
    }
  };

  const toggleReaction = (conversationId: string, messageId: string, emoji: string) => {
    if (!currentUser) return;

    setMessages((prev) => {
      const convList = prev[conversationId] || [];
      const updated = convList.map((msg) => {
        if (msg.id !== messageId) return msg;

        const currentReactions = { ...(msg.reactions || {}) };
        const usersForEmoji = currentReactions[emoji] || [];

        if (usersForEmoji.includes(currentUser.id)) {
          // Remove reaction
          const filtered = usersForEmoji.filter((id) => id !== currentUser.id);
          if (filtered.length === 0) {
            delete currentReactions[emoji];
          } else {
            currentReactions[emoji] = filtered;
          }
        } else {
          // Add reaction
          currentReactions[emoji] = [...usersForEmoji, currentUser.id];
        }

        return {
          ...msg,
          reactions: currentReactions,
        };
      });

      return {
        ...prev,
        [conversationId]: updated,
      };
    });

    if (authMode === 'supabase') {
      ChatService.toggleReaction(messageId, currentUser.id, emoji).catch(console.warn);
    }
  };

  const editMessage = (conversationId: string, messageId: string, newText: string) => {
    if (!newText.trim() || !currentUser) return;

    setMessages((prev) => {
      const convList = prev[conversationId] || [];
      return {
        ...prev,
        [conversationId]: convList.map((msg) => {
          if (msg.id === messageId && msg.senderId === currentUser.id) {
            return {
              ...msg,
              text: newText.trim(),
              isEdited: true,
            };
          }
          return msg;
        }),
      };
    });

    if (authMode === 'supabase') {
      ChatService.editMessage(messageId, currentUser.id, newText).catch(console.warn);
    }
  };

  const deleteMessage = (conversationId: string, messageId: string) => {
    if (!currentUser) return;

    setMessages((prev) => {
      const convList = prev[conversationId] || [];
      return {
        ...prev,
        [conversationId]: convList.filter((msg) => msg.id !== messageId),
      };
    });

    if (authMode === 'supabase') {
      ChatService.deleteMessage(messageId, currentUser.id).catch(console.warn);
    }
  };

  const translateMessage = async (
    conversationId: string,
    messageId: string,
    targetLang: 'en' | 'fr' | 'es' = 'en'
  ) => {
    const currentList = messages[conversationId] || [];
    const targetMsg = currentList.find((m) => m.id === messageId);
    if (!targetMsg) return;

    // Toggle off if already translated
    if (targetMsg.translatedText) {
      setMessages((prev) => ({
        ...prev,
        [conversationId]: (prev[conversationId] || []).map((m) =>
          m.id === messageId ? { ...m, translatedText: undefined } : m
        ),
      }));
      return;
    }

    const { translatedText } = await TranslationService.translate(targetMsg.text, targetLang);

    setMessages((prev) => ({
      ...prev,
      [conversationId]: (prev[conversationId] || []).map((m) =>
        m.id === messageId
          ? {
              ...m,
              originalText: m.text,
              translatedText,
            }
          : m
      ),
    }));
  };

  const addMemberToGroup = (conversationId: string, userId: string) => {
    const userToAdd = users.find((u) => u.id === userId);
    if (!userToAdd || !currentUser) return;

    const timeStr = formatCurrentTime();

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === conversationId && !c.participantIds.includes(userId)) {
          return {
            ...c,
            participantIds: [...c.participantIds, userId],
            lastMessage: `${currentUser.name} added ${userToAdd.name} to the circle`,
            lastMessageTimestamp: timeStr,
          };
        }
        return c;
      })
    );

    const sysMsg: Message = {
      id: `msg-add-${Date.now()}`,
      conversationId,
      senderId: currentUser.id,
      text: `👋 ${currentUser.name} added ${userToAdd.name} to this private circle.`,
      timestamp: timeStr,
    };

    setMessages((prev) => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] || []), sysMsg],
    }));
  };

  // Calling Controls
  const startCall = (
    conversationId: string,
    partnerId: string,
    partnerName: string,
    callType: CallType
  ) => {
    setActiveCall({
      id: `call-${Date.now()}`,
      conversationId,
      partnerId,
      partnerName,
      callType,
      status: 'outgoing',
      durationSeconds: 0,
      isMuted: false,
      isVideoOff: false,
      isScreenSharing: false,
    });
  };

  const acceptCall = () => {
    if (!activeCall) return;
    setActiveCall({
      ...activeCall,
      status: 'connected',
      startedAt: formatCurrentTime(),
    });
  };

  const endCall = () => {
    if (!activeCall) return;

    // Log call to history
    const newLog: CallLogRecord = {
      id: `call-log-${Date.now()}`,
      partnerId: activeCall.partnerId,
      partnerName: activeCall.partnerName,
      callType: activeCall.callType,
      direction: 'outgoing',
      status: activeCall.status === 'connected' ? 'completed' : 'missed',
      durationSeconds: activeCall.durationSeconds,
      timestamp: 'Just now',
    };
    setCallLogs((prev) => [newLog, ...prev]);

    setActiveCall({
      ...activeCall,
      status: 'ended',
    });
    setTimeout(() => {
      setActiveCall(null);
    }, 1500);
  };

  const toggleCallMute = () => {
    if (!activeCall) return;
    setActiveCall({
      ...activeCall,
      isMuted: !activeCall.isMuted,
    });
  };

  const toggleCallVideo = () => {
    if (!activeCall) return;
    setActiveCall({
      ...activeCall,
      isVideoOff: !activeCall.isVideoOff,
    });
  };

  const toggleCallScreenShare = () => {
    if (!activeCall) return;
    setActiveCall({
      ...activeCall,
      isScreenSharing: !activeCall.isScreenSharing,
    });
  };

  // Location & Privacy
  const recordLocationAudit = (
    action: LocationAuditAction,
    details: string,
    targetUserId?: string,
    targetUserName?: string
  ) => {
    const record: LocationAuditRecord = {
      id: `audit-${Date.now()}`,
      userId: targetUserId || currentUser?.id || 'unknown',
      userName: targetUserName || currentUser?.name || 'Unknown User',
      action,
      timestamp: new Date().toLocaleString(),
      details,
    };
    setLocationAuditLog((prev) => [record, ...prev]);
  };

  const updateLocationSettings = (settings: Partial<UserLocationSettings>) => {
    if (!currentUser) return;

    const previousAudience = currentUser.locationSettings?.audience;
    const newAudience = settings.audience || previousAudience || 'off';

    if (newAudience === 'partner_and_admin' && previousAudience !== 'partner_and_admin') {
      recordLocationAudit(
        'granted_admin',
        `${currentUser.name} explicitly enabled location sharing with Circle Administrators.`
      );
    } else if (
      previousAudience === 'partner_and_admin' &&
      newAudience !== 'partner_and_admin'
    ) {
      recordLocationAudit(
        'revoked_admin',
        `${currentUser.name} revoked location sharing permissions for Circle Administrators.`
      );
    } else if (settings.enabled === true && !currentUser.locationSettings?.enabled) {
      recordLocationAudit(
        'started_sharing',
        `${currentUser.name} started location sharing (Audience: ${newAudience}).`
      );
    }

    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === currentUser.id) {
          const currentLoc = u.locationSettings || {
            enabled: false,
            audience: 'off',
            duration: 'always',
          };
          const merged = {
            ...currentLoc,
            ...settings,
            sharedAt: settings.enabled ? new Date().toLocaleString() : undefined,
          };

          // If connected to Supabase, sync to profiles table
          if (authMode === 'supabase' && isSupabaseConfigured() && currentUser?.id) {
            const supabase = getSupabaseClient();
            if (supabase) {
              supabase
                .from('profiles')
                .update({ location_settings: merged })
                .eq('id', currentUser.id)
                .then(({ error }: { error: any }) => {
                  if (error) console.error('Failed to sync location to Supabase profile:', error);
                });
            }
          }

          return {
            ...u,
            locationSettings: merged,
          };
        }
        return u;
      })
    );
  };

  const stopLocationSharing = () => {
    if (!currentUser) return;
    recordLocationAudit(
      'stopped_sharing',
      `${currentUser.name} stopped location sharing.`
    );
    updateLocationSettings({
      enabled: false,
      audience: 'off',
    });
  };

  // Privacy Center Methods
  const privacySettings: PrivacySettings =
    currentUser?.privacySettings ||
    PrivacyService.getDefaultPrivacySettings(currentUser?.id);

  const updatePrivacySettings = (settings: Partial<PrivacySettings>) => {
    if (!currentUser) return;
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === currentUser.id) {
          const currentPriv = u.privacySettings || PrivacyService.getDefaultPrivacySettings(u.id);
          return {
            ...u,
            privacySettings: {
              ...currentPriv,
              ...settings,
            },
          };
        }
        return u;
      })
    );
  };

  const revokeLocationPermissionForUser = (targetUserId: string) => {
    if (!currentUser) return;
    const targetUser = users.find((u) => u.id === targetUserId);
    const updatedIds = (privacySettings.allowedLocationUserIds || []).filter(
      (id) => id !== targetUserId
    );

    updatePrivacySettings({
      allowedLocationUserIds: updatedIds,
    });

    recordLocationAudit(
      'revoked_admin',
      `${currentUser.name} revoked location sharing permission for ${targetUser?.name || targetUserId}.`
    );
  };

  const revokeAllLocationPermissions = () => {
    if (!currentUser) return;
    updatePrivacySettings({
      allowedLocationUserIds: [],
      exactLocationEnabled: false,
      approximateLocationEnabled: false,
    });

    stopLocationSharing();

    recordLocationAudit(
      'stopped_sharing',
      `${currentUser.name} revoked all location sharing permissions immediately.`
    );
  };

  const requestAccountDeletion = () => {
    if (!currentUser) return;
    setUsers((prev) => prev.filter((u) => u.id !== currentUser.id));
    logout();
  };

  // Admin Controls
  const approveInvitation = async (id: string) => {
    if (authMode === 'supabase') {
      const res = await AdminService.updateInvitationStatus(id, 'approved');
      if (res.success) {
        setInvitations((prev) =>
          prev.map((inv) => (inv.id === id ? { ...inv, status: 'approved' } : inv))
        );
      }
      return res;
    }
    setInvitations((prev) =>
      prev.map((inv) => (inv.id === id ? { ...inv, status: 'approved' } : inv))
    );
    return { success: true, error: null };
  };

  const rejectInvitation = async (id: string) => {
    if (authMode === 'supabase') {
      const res = await AdminService.updateInvitationStatus(id, 'rejected');
      if (res.success) {
        setInvitations((prev) =>
          prev.map((inv) => (inv.id === id ? { ...inv, status: 'rejected' } : inv))
        );
      }
      return res;
    }
    setInvitations((prev) =>
      prev.map((inv) => (inv.id === id ? { ...inv, status: 'rejected' } : inv))
    );
    return { success: true, error: null };
  };

  const createInvitationCode = async (email: string) => {
    if (authMode === 'supabase' && currentUser) {
      const res = await AdminService.createInvitation(email, currentUser.id);
      if (!res.error && res.invitation) {
        setInvitations((prev) => [res.invitation!, ...prev]);
      }
      return res;
    }

    const newInv: Invitation = {
      id: `inv-${Date.now()}`,
      email: email.trim(),
      invitedBy: `${currentUser?.name || 'Admin'} (${currentUser?.email || ''})`,
      status: 'pending',
      createdAt: new Date().toLocaleString(),
      code: `PRIV-${Math.floor(1000 + Math.random() * 9000)}-${email.substring(0, 3).toUpperCase()}`,
      expiresAt: 'In 48 hours',
    };
    setInvitations((prev) => [newInv, ...prev]);
    return { invitation: newInv, error: null };
  };

  const toggleSuspendMember = async (userId: string) => {
    const targetUser = users.find((u) => u.id === userId);
    const newStatus: UserStatus = targetUser?.status === 'active' ? 'suspended' : 'active';

    if (authMode === 'supabase') {
      const res = await AdminService.toggleUserSuspension(userId, newStatus);
      if (res.success) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, status: newStatus } : u))
        );
      }
      return res;
    }

    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, status: newStatus } : u))
    );
    return { success: true, error: null };
  };

  const removeMember = (userId: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  // Relationship Hub
  const addLoveNote = (content: string) => {
    if (!content.trim() || !currentUser) return;
    const newNote: LoveNote = {
      id: `note-${Date.now()}`,
      authorId: currentUser.id,
      authorName: currentUser.name,
      content: content.trim(),
      createdAt: 'Just now',
      isFavorite: false,
    };
    setLoveNotes((prev) => [newNote, ...prev]);
  };

  const toggleFavoriteNote = (noteId: string) => {
    setLoveNotes((prev) =>
      prev.map((n) => (n.id === noteId ? { ...n, isFavorite: !n.isFavorite } : n))
    );
  };

  const addMilestone = (
    title: string,
    date: string,
    category: RelationshipMilestone['category'],
    description: string,
    icon = '✨'
  ) => {
    if (!title.trim()) return;
    const newMile: RelationshipMilestone = {
      id: `mile-${Date.now()}`,
      title: title.trim(),
      date: date.trim() || 'Today',
      category,
      description: description.trim(),
      icon,
    };
    setMilestones((prev) => [newMile, ...prev]);
  };

  // Memories Vault
  const addMemory = (item: Omit<MemoryItem, 'id' | 'date'>) => {
    const newMem: MemoryItem = {
      ...item,
      id: `mem-${Date.now()}`,
      date: 'Just now',
    };
    setMemories((prev) => [newMem, ...prev]);
  };

  const toggleMemoryReaction = (memoryId: string, emoji: string) => {
    if (!currentUser) return;
    setMemories((prev) =>
      prev.map((mem) => {
        if (mem.id !== memoryId) return mem;
        const currentReactions = { ...(mem.reactions || {}) };
        const usersForEmoji = currentReactions[emoji] || [];
        const hasReacted = usersForEmoji.includes(currentUser.id);

        if (hasReacted) {
          currentReactions[emoji] = usersForEmoji.filter((id) => id !== currentUser.id);
          if (currentReactions[emoji].length === 0) {
            delete currentReactions[emoji];
          }
        } else {
          currentReactions[emoji] = [...usersForEmoji, currentUser.id];
        }
        return { ...mem, reactions: currentReactions };
      })
    );
  };

  const addMemoryComment = (memoryId: string, text: string) => {
    if (!currentUser || !text.trim()) return;
    const newComment = {
      id: `comm-${Date.now()}`,
      authorId: currentUser.id,
      authorName: currentUser.name,
      text: text.trim(),
      timestamp: 'Just now',
    };
    setMemories((prev) =>
      prev.map((mem) => {
        if (mem.id !== memoryId) return mem;
        return { ...mem, comments: [...(mem.comments || []), newComment] };
      })
    );
  };

  const deleteMemory = (memoryId: string) => {
    setMemories((prev) => prev.filter((m) => m.id !== memoryId));
  };

  // Calendar & Countdowns
  const addCalendarEvent = (event: Omit<CalendarEvent, 'id' | 'ownerId' | 'ownerName'>) => {
    if (!currentUser) return;
    const newEvt: CalendarEvent = {
      ...event,
      id: `cal-evt-${Date.now()}`,
      ownerId: currentUser.id,
      ownerName: currentUser.name,
    };
    setCalendarEvents((prev) => [newEvt, ...prev]);
  };

  const updateCalendarEvent = (id: string, updates: Partial<CalendarEvent>) => {
    setCalendarEvents((prev) =>
      prev.map((evt) => (evt.id === id ? { ...evt, ...updates } : evt))
    );
  };

  const deleteCalendarEvent = (id: string) => {
    setCalendarEvents((prev) => prev.filter((evt) => evt.id !== id));
  };

  // Notifications
  const markNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  // Settings
  const updateUserProfile = (profile: Partial<User>) => {
    if (!currentUser) return;
    setUsers((prev) =>
      prev.map((u) => (u.id === currentUser.id ? { ...u, ...profile } : u))
    );
  };

  const terminateDeviceSession = (sessionId: string) => {
    setDeviceSessions((prev) => prev.filter((s) => s.id !== sessionId));
  };

  const terminateAllOtherSessions = () => {
    setDeviceSessions((prev) =>
      prev.filter((s) => s.isCurrent || (currentUser && s.userId !== currentUser.id))
    );
  };

  const resetToMockData = () => {
    StorageService.remove(STORAGE_KEY);
    setUsers(INITIAL_USERS);
    setConversations(INITIAL_CONVERSATIONS);
    setMessages(INITIAL_MESSAGES);
    setInvitations(INITIAL_INVITATIONS);
    setLocationAuditLog(INITIAL_LOCATION_AUDIT_LOG);
    setMilestones(INITIAL_MILESTONES);
    setLoveNotes(INITIAL_LOVE_NOTES);
    setMemories(INITIAL_MEMORIES);
    setCallLogs(INITIAL_CALL_LOGS);
    setNotifications(INITIAL_NOTIFICATIONS);
    setCalendarEvents(INITIAL_CALENDAR_EVENTS);
    setDeviceSessions(INITIAL_DEVICE_SESSIONS);
    setCurrentUserId('user-admin');
    setActiveConversationId(INITIAL_CONVERSATIONS[1]?.id || INITIAL_CONVERSATIONS[0].id);
    setCurrentView('chat');
    setActiveCall(null);
    setReplyingToMessage(null);
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        users,
        conversations,
        messages,
        invitations,
        activeConversationId,
        currentView,
        isMobileSidebarOpen,
        activeCall,
        isLocationModalOpen,
        isNotificationsModalOpen,
        locationAuditLog,
        milestones,
        loveNotes,
        memories,
        callLogs,
        notifications,
        replyingToMessage,
        unreadNotificationsCount,
        isAuthChecking,
        authMode,
        setAuthMode,
        supabaseSignIn,
        supabaseSignUp,
        supabaseSignInWithOAuth,
        verifyInvitationCode,
        supabaseSignOut,
        supabaseResetPassword,
        login,
        logout,
        setActiveConversationId,
        setCurrentView,
        setIsMobileSidebarOpen,
        setIsLocationModalOpen,
        setIsNotificationsModalOpen,
        setReplyingToMessage,
        sendMessage,
        toggleReaction,
        editMessage,
        deleteMessage,
        translateMessage,
        addMemberToGroup,
        startCall,
        acceptCall,
        endCall,
        toggleCallMute,
        toggleCallVideo,
        toggleCallScreenShare,
        updateLocationSettings,
        stopLocationSharing,
        recordLocationAudit,
        approveInvitation,
        rejectInvitation,
        createInvitationCode,
        toggleSuspendMember,
        removeMember,
        refreshAdminData,
        uploadAttachment,
        addLoveNote,
        toggleFavoriteNote,
        addMilestone,
        addMemory,
        toggleMemoryReaction,
        addMemoryComment,
        deleteMemory,
        calendarEvents,
        addCalendarEvent,
        updateCalendarEvent,
        deleteCalendarEvent,
        markNotificationRead,
        markAllNotificationsRead,
        updateUserProfile,
        deviceSessions,
        terminateDeviceSession,
        terminateAllOtherSessions,
        privacySettings,
        updatePrivacySettings,
        revokeLocationPermissionForUser,
        revokeAllLocationPermissions,
        requestAccountDeletion,
        resetToMockData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppState => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
