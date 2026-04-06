# Testing & Verification Guide

This document outlines the strategy for verifying the real-time collaboration, commenting, and notification features of the platform.

## 1. Manual Collaboration Test (Multi-Window)
The most direct way to test real-time features is by simulating multiple users.

1.  **Open the App**: Navigate to `http://localhost:5173`.
2.  **Login User A**: Use an existing account or create one.
3.  **Open Document**: Open any document (e.g., "Meeting Notes"). 
4.  **Open Incognito/Second Browser**: 
    - Navigate to the same document URL.
    - Login as **User B**.
5.  **Verify Presence**:
    - Check the top right corner. You should see two avatars (User A and User B). (thier is no any avatar)
    - Mouse over the avatars to see emails. (thier is only email)
6.  **Verify Editor Sync**:
    - Type in User A's window.
    - Confirm characters appear instantly in User B's window.
    - Confirm User A's cursor is visible in User B's window.

## 2. Commenting & Anchoring Test
1.  **Add Comment**:
    - In User A's window, highlight a word and click the **Message** icon in the toolbar.
    - Enter a comment (e.g., "Should we change this?").
2.  **Verify Sync**:
    - User B should see the word highlighted in indigo immediately.
    - User B should see the comment in the right-side sidebar.
3.  **Anchoring Verification**:
    - In User B's window, type several paragraphs *above* the commented word.
    - Confirm the indigo highlight stays attached to the correct word and doesn't drift.
4.  **Replies & Resolution**:
    - In User B's window, reply to the comment.
    - In User A's window, click the **Checkmark** to resolve the comment.
    - Verify it moves to the "Resolved" tab in the sidebar for both users.

## 3. Mention & Notification Test
1.  **Create Mention**:
    - Add a new comment.
    - Type the email of another registered user (e.g., `@userb@example.com`).
2.  **Verify Notification**:
    - Check the backend console logs (`apps/api`). Look for `REDIS PUBLISH` events on the `user:*:notifications` channel.
    - (Future Improvement): Check for the notification bell badge in the UI.

## 4. Troubleshooting
- **No Sync?**: Check if `pnpm run dev` is running in both `apps/api` and `apps/web`.
- **WebSocket Connection Error?**: Check the browser console. If using a custom port, ensure `VITE_WS_URL` is set to `ws://localhost:3000`.
- **Database Errors?**: Run `npx prisma migrate dev` in `packages/db` to ensure your schema is up to date.

## 5. Automated Testing (Next Steps)
To implement industrial-grade testing, we recommend:
- **Vitest**: For unit testing logic in `comment.service.ts` and `user.service.ts`.
- **Playwright**: For E2E tests that launch two browser instances simultaneously to verify CRDT synchronization.
