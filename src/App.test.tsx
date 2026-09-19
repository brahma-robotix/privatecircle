import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import App from './App';
import { INITIAL_USERS } from './data/mockData';

describe('PrivateCircle Prototype Verification', () => {
  beforeEach(() => {
    localStorage.clear();
    // Pre-set scrollIntoView mock for jsdom
    window.HTMLElement.prototype.scrollIntoView = function () {};
    window.confirm = () => true;
  });

  it('verifies mock accounts specifications', () => {
    const admin = INITIAL_USERS.find((u) => u.email === 'admin@example.test');
    const girlfriend = INITIAL_USERS.find((u) => u.email === 'girlfriend@example.test');
    const friend1 = INITIAL_USERS.find((u) => u.email === 'friend1@example.test');
    const friend2 = INITIAL_USERS.find((u) => u.email === 'friend2@example.test');

    expect(admin).toBeDefined();
    expect(admin?.role).toBe('admin');

    expect(girlfriend).toBeDefined();
    expect(girlfriend?.role).toBe('member');

    expect(friend1).toBeDefined();
    expect(friend1?.role).toBe('member');

    expect(friend2).toBeDefined();
    expect(friend2?.role).toBe('member');
  });

  it('renders login screen when logged out and allows demo account login', async () => {
    render(<App />);

    // Switch account to reveal login screen
    const switchBtn = screen.getByRole('button', { name: /switch account/i });
    fireEvent.click(switchBtn);

    expect(screen.getByText(/Welcome to PrivateCircle/i)).toBeDefined();
    expect(screen.getByText(/PROTOTYPE DEMO/i)).toBeDefined();
    expect(screen.getAllByText(/Alex \(Admin\)/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Maya/i).length).toBeGreaterThan(0);

    // Select Maya demo account
    const mayaLoginBtn = screen.getByRole('button', { name: /Maya.*girlfriend@example\.test/i });
    
    // Wrap in act for timer transition
    await act(async () => {
      fireEvent.click(mayaLoginBtn);
      await new Promise((r) => setTimeout(r, 300));
    });

    // Check header displays Maya
    const userNames = screen.getAllByText('Maya');
    expect(userNames.length).toBeGreaterThan(0);
  });

  it('verifies Admin has access to Admin Dashboard while Member does not', async () => {
    render(<App />);

    // Alex (Admin) starts logged in, Admin Dashboard is available
    expect(screen.getByRole('button', { name: /🛡️ Admin Dashboard/i })).toBeDefined();

    // Switch to Maya (Member)
    const switchBtn = screen.getByRole('button', { name: /switch account/i });
    fireEvent.click(switchBtn);

    const mayaBtn = screen.getByRole('button', { name: /Maya.*girlfriend@example\.test/i });
    await act(async () => {
      fireEvent.click(mayaBtn);
      await new Promise((r) => setTimeout(r, 300));
    });

    // Maya has no Admin Dashboard tab in header
    expect(screen.queryByRole('button', { name: /🛡️ Admin Dashboard/i })).toBeNull();
  });

  it('verifies sending a message in a conversation and updating sidebar snippet', () => {
    render(<App />);

    // Select Maya direct conversation from sidebar
    const mayaConv = screen.getByRole('button', { name: /Maya/i });
    fireEvent.click(mayaConv);

    const input = screen.getByPlaceholderText(/Message Maya/i) as HTMLInputElement;
    const sendBtn = screen.getByRole('button', { name: /Send/i });

    const testMessageText = 'Hello Maya, testing verified private messaging!';
    fireEvent.change(input, { target: { value: testMessageText } });
    fireEvent.click(sendBtn);

    // Message appears both in the chat stream AND in the sidebar snippet preview
    const matchingElements = screen.getAllByText(testMessageText);
    expect(matchingElements.length).toBe(2);
  });

  it('verifies Group Chat preview and member directory modal', () => {
    render(<App />);

    // Select Our Inner Circle group chat
    const groupConv = screen.getByRole('button', { name: /Our Inner Circle/i });
    fireEvent.click(groupConv);

    // Click to open Group Info Modal
    const groupInfoBtn = screen.getByRole('button', { name: /Circle Members/i });
    fireEvent.click(groupInfoBtn);

    // Modal should be visible
    expect(screen.getByText(/Private Group Circle/i)).toBeDefined();
    expect(screen.getByText(/About this Circle/i)).toBeDefined();
    expect(screen.getByText(/➕ Add People to Group/i)).toBeDefined();

    // Should list 4 circle members
    expect(screen.getByText(/Current Circle Members \(4\)/i)).toBeDefined();

    // Close preview modal
    const closeBtn = screen.getByRole('button', { name: /Close Circle Info/i });
    fireEvent.click(closeBtn);

    expect(screen.queryByText(/Private Group Circle/i)).toBeNull();
  });

  it('verifies + Add People button in group chat header opens modal with add options', () => {
    render(<App />);

    const groupConv = screen.getByRole('button', { name: /Our Inner Circle/i });
    fireEvent.click(groupConv);

    // + Add People button in group header
    const addPeopleBtn = screen.getByRole('button', { name: /Add people to group/i });
    expect(addPeopleBtn).toBeDefined();

    fireEvent.click(addPeopleBtn);
    expect(screen.getByText(/➕ Add People to Group/i)).toBeDefined();
    expect(screen.getByText(/Current Circle Members \(4\)/i)).toBeDefined();
  });

  it('verifies Admin Dashboard prototype actions: approve/reject invites and member suspension', () => {
    render(<App />);

    // Navigate to Admin Dashboard as Alex
    const adminTab = screen.getByRole('button', { name: /🛡️ Admin Dashboard/i });
    fireEvent.click(adminTab);

    expect(screen.getByRole('heading', { name: /Approved Circle Members/i })).toBeDefined();
    expect(screen.getByRole('heading', { name: /Pending Access Requests/i })).toBeDefined();

    // Find Approve button for pending invite
    const approveBtn = screen.getAllByRole('button', { name: /✓ Approve \(Demo\)/i })[0];
    fireEvent.click(approveBtn);

    // Notification feedback appears
    expect(screen.getByText(/\[Prototype Action\] Approved invitation/i)).toBeDefined();

    // Test suspend action on a member
    const suspendBtns = screen.getAllByRole('button', { name: /Suspend/i });
    expect(suspendBtns.length).toBeGreaterThan(0);
    fireEvent.click(suspendBtns[0]);

    // Status update feedback appears
    expect(screen.getByText(/has been suspended/i)).toBeDefined();
  });

  it('verifies mock calling interface with outgoing, connected, and mute states', async () => {
    render(<App />);

    // Select Maya direct chat
    const mayaConv = screen.getByRole('button', { name: /Maya/i });
    fireEvent.click(mayaConv);

    // Click Voice Call button
    const callBtn = screen.getByRole('button', { name: /Start Voice Call/i });
    fireEvent.click(callBtn);

    // Call overlay appears with prototype disclaimer
    expect(screen.getByText(/PROTOTYPE DEMO: Simulated Calling Interface/i)).toBeDefined();
    expect(screen.getByText(/Calling... \(Ringing\)/i)).toBeDefined();

    // Click Simulate Answer to transition to connected state
    const answerBtn = screen.getByRole('button', { name: /Simulate Answer/i });
    fireEvent.click(answerBtn);

    expect(screen.getByText(/Connected • 00:00/i)).toBeDefined();

    // Test mute toggle
    const muteBtn = screen.getByRole('button', { name: /Mute/i });
    fireEvent.click(muteBtn);
    expect(screen.getByRole('button', { name: /Unmute/i })).toBeDefined();

    // End call
    const endCallBtn = screen.getByRole('button', { name: /End Call/i });
    fireEvent.click(endCallBtn);

    expect(screen.getByText(/Call Ended/i)).toBeDefined();
  });

  it('verifies media attachment picker and sending photo message', () => {
    render(<App />);

    const mayaConv = screen.getByRole('button', { name: /Maya/i });
    fireEvent.click(mayaConv);

    // Open media attachment modal
    const attachBtn = screen.getByRole('button', { name: /Attach photo or video/i });
    fireEvent.click(attachBtn);

    expect(screen.getByText(/Send Photo or Short Video/i)).toBeDefined();
    expect(screen.getByText(/Videos must be under 60 seconds/i)).toBeDefined();

    // Use sample demo photo button
    const samplePhotoBtn = screen.getByRole('button', { name: /Sample Photo \(Sunset\)/i });
    fireEvent.click(samplePhotoBtn);

    // Preview appears
    expect(screen.getByAltText(/Selected attachment preview/i)).toBeDefined();

    // Send the attachment
    const sendAttachmentBtn = screen.getByRole('button', { name: /Send Attachment/i });
    fireEvent.click(sendAttachmentBtn);

    // Verify photo appears in messages stream and sidebar preview
    expect(screen.getAllByText(/Look at this beautiful sunset view for us/i).length).toBe(2);
  });

  it('verifies relationship distance calculation and unshared fallback state', () => {
    render(<App />);

    // Select Maya direct chat (both Alex and Maya have location enabled initially)
    const mayaConv = screen.getByRole('button', { name: /Maya/i });
    fireEvent.click(mayaConv);

    // Distance calculation should be displayed (New York to Paris is approx 5,837 km)
    expect(screen.getByText(/5,837/i)).toBeDefined();
    expect(screen.getByText(/Demo GPS Calculation/i)).toBeDefined();

    // Now select Sam (who has location disabled)
    const samConv = screen.getByRole('button', { name: /Sam/i });
    fireEvent.click(samConv);

    // Should show unshared fallback
    expect(screen.getByText(/Location not shared by Sam/i)).toBeDefined();
  });

  it('verifies Admin location privacy restrictions and audit logging', () => {
    render(<App />);

    // Navigate to Admin Dashboard as Alex
    const adminTab = screen.getByRole('button', { name: /🛡️ Admin Dashboard/i });
    fireEvent.click(adminTab);

    // Check Member Location Privacy section exists
    expect(screen.getByRole('heading', { name: /Member Location Privacy & Admin Access/i })).toBeDefined();

    // Maya has NOT granted admin consent: exact location must be hidden
    expect(screen.getAllByText(/Location Hidden \(No admin consent\)/i).length).toBeGreaterThan(0);

    // Check Location Access Audit Log table exists
    expect(screen.getByRole('heading', { name: /Location Access Audit Log/i })).toBeDefined();
  });

  it('verifies Home View renders partner glance, dual clocks, and days together', () => {
    render(<App />);

    // Click Home nav button in SidebarDock
    const homeBtn = screen.getAllByRole('button', { name: 'Home' })[0];
    fireEvent.click(homeBtn);

    expect(screen.getByText(/Connected with Maya/i)).toBeDefined();
    expect(screen.getByText(/Private Long-Distance Sanctuary/i)).toBeDefined();
    expect(screen.getByText(/DAYS TOGETHER/i)).toBeDefined();
    expect(screen.getByText(/VIRTUAL TOUCH/i)).toBeDefined();
  });

  it('verifies Relationship Hub renders milestone scrapbook, dual clocks, and love notes', () => {
    render(<App />);

    // Click Couple / Relationship nav button in SidebarDock
    const relBtn = screen.getAllByRole('button', { name: 'Couple' })[0];
    fireEvent.click(relBtn);

    expect(screen.getByText(/Relationship & Couple Hub/i)).toBeDefined();
    expect(screen.getByText(/Our Journey Together/i)).toBeDefined();
    expect(screen.getByText(/Time Difference/i)).toBeDefined();
    expect(screen.getByText(/Milestone Scrapbook/i)).toBeDefined();
    expect(screen.getByText(/Private Love Notes/i)).toBeDefined();
  });

  it('verifies message reactions toggle and inline translation in chat', async () => {
    render(<App />);

    // Select Maya direct chat
    const mayaConv = screen.getByRole('button', { name: /Maya/i });
    fireEvent.click(mayaConv);

    // Verify existing reaction chip (e.g. ❤️ on msg-am-1)
    expect(screen.getAllByText('❤️').length).toBeGreaterThan(0);

    // Find translate button for a message
    const translateBtns = screen.getAllByRole('button', { name: /Translate message/i });
    expect(translateBtns.length).toBeGreaterThan(0);

    await act(async () => {
      fireEvent.click(translateBtns[0]);
      await new Promise((r) => setTimeout(r, 250));
    });

    // Translation badge should appear
    expect(screen.getByText(/🌐 Translation/i)).toBeDefined();
  });

  it('verifies Memories Vault renders media albums and filters', () => {
    render(<App />);

    const memBtn = screen.getAllByRole('button', { name: 'Memories' })[0];
    fireEvent.click(memBtn);

    expect(screen.getByText(/Shared Memories & Media Vault/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Paris Moments/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Trips & Dates/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Favorites/i })).toBeDefined();
  });

  it('verifies Calls View displays call history logs and start call actions', () => {
    render(<App />);

    const callsBtn = screen.getByRole('button', { name: 'Calls' });
    fireEvent.click(callsBtn);

    expect(screen.getByText(/Private Voice & Video Calls/i)).toBeDefined();
    expect(screen.getByText(/Recent Call History/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Start Voice Call/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Start Video Call/i })).toBeDefined();
  });

  it('verifies Privacy Center renders all privacy sections and controls', () => {
    render(<App />);

    // Click Privacy nav button in SidebarDock
    const privacyBtn = screen.getByRole('button', { name: 'Privacy' });
    fireEvent.click(privacyBtn);

    expect(screen.getByRole('heading', { name: /Privacy Center/i })).toBeDefined();
    expect(screen.getByRole('heading', { name: /Communication & Presence/i })).toBeDefined();
    expect(screen.getByRole('heading', { name: /Location Sharing & Permissions/i })).toBeDefined();
    expect(screen.getByRole('heading', { name: /Text Translation & AI Discretion/i })).toBeDefined();
    expect(screen.getByRole('heading', { name: /Notification Previews/i })).toBeDefined();
    expect(screen.getByRole('heading', { name: /Your Data Rights & Deletion/i })).toBeDefined();
  });

  it('verifies Privacy Center location permission revocation and translation consent toggling', () => {
    render(<App />);

    const privacyBtn = screen.getByRole('button', { name: 'Privacy' });
    fireEvent.click(privacyBtn);

    // Verify Maya is listed as having location permission for Alex
    expect(screen.getAllByText(/Maya/i).length).toBeGreaterThan(0);

    // Click Revoke button for Maya
    const revokeBtn = screen.getByRole('button', { name: /Revoke location permission for Maya/i });
    fireEvent.click(revokeBtn);

    // Feedback should show revocation
    expect(screen.getByText(/Revoked location access for Maya/i)).toBeDefined();

    // Toggle External Translation Consent
    const translationConsentBtn = screen.getByRole('button', { name: /Toggle External Translation Consent/i });
    fireEvent.click(translationConsentBtn);
    expect(screen.getByText(/External translation consent required/i)).toBeDefined();
  });

  it('renders Shared Calendar and Countdowns view and tests event creation and tabs', () => {
    render(<App />);

    // Click Calendar nav button in SidebarDock
    const calendarBtn = screen.getByRole('button', { name: 'Calendar' });
    fireEvent.click(calendarBtn);

    // Verify Calendar title and privacy banner
    expect(screen.getByRole('heading', { name: /Shared Calendar & Countdowns/i })).toBeDefined();
    expect(screen.getByText(/Strict Privacy & No GPS Tracking/i)).toBeDefined();

    // Verify initial countdowns
    expect(screen.getByText(/Flight AF007 to Paris \(CDG\)/i)).toBeDefined();
    expect(screen.getByText(/Maya's 25th Birthday/i)).toBeDefined();

    // Switch to Month Grid tab
    const monthTab = screen.getByRole('button', { name: /Month View Tab/i });
    fireEvent.click(monthTab);
    expect(screen.getByRole('region', { name: /Month Calendar/i })).toBeDefined();

    // Switch to All Events list tab
    const listTab = screen.getByRole('button', { name: /All Events Tab/i });
    fireEvent.click(listTab);
    expect(screen.getByRole('region', { name: /All Events List/i })).toBeDefined();

    // Open Add Event modal
    const addEventBtn = screen.getByRole('button', { name: /Add Calendar Event/i });
    fireEvent.click(addEventBtn);

    expect(screen.getByRole('heading', { name: /Add Calendar Event/i })).toBeDefined();

    // Fill form
    const titleInput = screen.getByLabelText(/Event Title/i);
    fireEvent.change(titleInput, { target: { value: 'Paris Reunion Weekend' } });

    const submitBtn = screen.getByRole('button', { name: /Create Event/i });
    fireEvent.click(submitBtn);

    // Verify feedback and new event presence
    expect(screen.getByText(/Added new calendar event/i)).toBeDefined();
    expect(screen.getByText(/Paris Reunion Weekend/i)).toBeDefined();
  });

  it('renders Memory Timeline and tests views, lightbox reactions, and video duration limit', () => {
    render(<App />);

    // Click Memories nav button in SidebarDock
    const memoriesBtn = screen.getAllByRole('button', { name: 'Memories' })[0];
    fireEvent.click(memoriesBtn);

    // Verify Memory Timeline header and privacy assurance
    expect(screen.getByRole('heading', { name: /Shared Memories & Media Vault/i })).toBeDefined();
    expect(screen.getByText(/Privacy Assured/i)).toBeDefined();

    // Verify initial timeline entries
    expect(screen.getByText(/Paris Sunset from Montmartre/i)).toBeDefined();
    expect(screen.getByText(/📍 Montmartre, Paris/i)).toBeDefined();

    // Switch to Grid View
    const gridBtn = screen.getByRole('button', { name: /Grid View/i });
    fireEvent.click(gridBtn);
    expect(screen.getByLabelText(/Memories Grid/i)).toBeDefined();

    // Switch back to Timeline View
    const timelineBtn = screen.getByRole('button', { name: /Timeline View/i });
    fireEvent.click(timelineBtn);
    expect(screen.getByLabelText(/Memory Timeline/i)).toBeDefined();

    // Open Upload Modal and test >60s video validation
    const addMemoryBtn = screen.getByRole('button', { name: /Add Memory to Vault/i });
    fireEvent.click(addMemoryBtn);

    expect(screen.getByRole('heading', { name: /Add Memory to Vault/i })).toBeDefined();

    // Select Media Type Video
    const typeSelect = screen.getByLabelText(/Media Type/i);
    fireEvent.change(typeSelect, { target: { value: 'video' } });

    // Set duration to 90s (>60s)
    const durationInput = screen.getByLabelText(/Video Duration/i);
    fireEvent.change(durationInput, { target: { value: '90' } });

    // Fill title
    const titleInput = screen.getByLabelText(/Memory Title/i);
    fireEvent.change(titleInput, { target: { value: 'Long video clip' } });

    // Try submitting
    const saveBtn = screen.getByRole('button', { name: /Save to Vault/i });
    fireEvent.click(saveBtn);

    // Should see error message enforcing <60s limit
    expect(screen.getByText(/Videos in PrivateCircle must be 60 seconds or shorter/i)).toBeDefined();
  });

  it('renders Voice Note player and tests recording, preview, and speed controls in chat', () => {
    render(<App />);

    // Click Chats nav button
    const chatsBtn = screen.getAllByRole('button', { name: 'Chats' })[0];
    fireEvent.click(chatsBtn);

    // Verify existing voice note player in message bubble
    const players = screen.getAllByRole('region', { name: /Voice Note Player/i });
    expect(players.length).toBeGreaterThan(0);

    // Check playback speed button
    const speedBtn = screen.getByRole('button', { name: /Playback speed: 1x/i });
    expect(speedBtn).toBeDefined();
    fireEvent.click(speedBtn);
    expect(screen.getByRole('button', { name: /Playback speed: 1.5x/i })).toBeDefined();

    // Click microphone button to start recording
    const micBtn = screen.getByRole('button', { name: /Record voice note/i });
    fireEvent.click(micBtn);

    // Verify Voice Note Recorder bar is active
    expect(screen.getByRole('region', { name: /Voice Note Recorder/i })).toBeDefined();
    expect(screen.getByText(/\/ 2:00/i)).toBeDefined();

    // Pause recording
    const pauseBtn = screen.getByRole('button', { name: /Pause recording/i });
    fireEvent.click(pauseBtn);
    expect(screen.getByRole('button', { name: /Resume recording/i })).toBeDefined();

    // Review to preview
    const reviewBtn = screen.getByRole('button', { name: /Review voice note/i });
    fireEvent.click(reviewBtn);

    // Verify Send Voice Note action in preview
    expect(screen.getByRole('button', { name: /Confirm send voice note/i })).toBeDefined();

    // Send voice note
    const sendVoiceBtn = screen.getByRole('button', { name: /Confirm send voice note/i });
    fireEvent.click(sendVoiceBtn);

    // Verify input bar returns and new voice note player is present
    expect(screen.getByPlaceholderText(/Message Maya\.\.\./i)).toBeDefined();
    expect(screen.getAllByRole('region', { name: /Voice Note Player/i }).length).toBeGreaterThan(players.length);
  });

  it('renders Trusted Devices & Sessions management and verifies single sign-out and bulk re-auth revocation', () => {
    render(<App />);

    // Click Settings nav button
    const settingsBtn = screen.getAllByRole('button', { name: 'Settings' })[0];
    fireEvent.click(settingsBtn);

    // Verify Trusted Devices section and Current Device
    expect(screen.getByRole('heading', { name: /Trusted Devices & Active Sessions/i })).toBeDefined();
    expect(screen.getByText(/THIS DEVICE \(CURRENT\)/i)).toBeDefined();
    expect(screen.getByText(/MacBook Pro 16"/i)).toBeDefined();

    // Verify other devices listed
    expect(screen.getByText(/iPhone 15 Pro/i)).toBeDefined();
    expect(screen.getByText(/iPad Air 5th Gen/i)).toBeDefined();

    // Test single device sign-out for iPhone 15 Pro
    const signOutIphoneBtn = screen.getByRole('button', { name: /Sign out iPhone 15 Pro/i });
    fireEvent.click(signOutIphoneBtn);

    // Verify feedback and removal of iPhone 15 Pro session button
    expect(screen.getByText(/Signed out iPhone 15 Pro/i)).toBeDefined();
    expect(screen.queryByRole('button', { name: /Sign out iPhone 15 Pro/i })).toBeNull();

    // Test bulk sign out all other devices with Re-Authentication prompt
    const bulkSignOutBtn = screen.getByRole('button', { name: /Sign Out All Other Devices/i });
    fireEvent.click(bulkSignOutBtn);

    // Verify Re-Authentication modal
    expect(screen.getByRole('heading', { name: /Confirm Device Revocation/i })).toBeDefined();

    // Enter passcode in reauth modal
    const passInput = screen.getByLabelText(/Enter Account Password or PIN/i);
    fireEvent.change(passInput, { target: { value: 'pass1234' } });

    const confirmBtn = screen.getByRole('button', { name: /Confirm & Sign Out All Devices/i });
    fireEvent.click(confirmBtn);

    // Verify all other devices are signed out
    expect(screen.getByText(/No other devices are currently signed in/i)).toBeDefined();
  });
});






