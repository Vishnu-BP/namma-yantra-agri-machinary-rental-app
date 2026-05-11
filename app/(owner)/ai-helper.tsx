/**
 * @file (owner)/ai-helper.tsx — AI Helper tab in the owner shell.
 * @module app
 *
 * Thin route-file wrapper around the shared `ChatScreen` so the renter
 * and owner tabs share the same UI but stay separately analyzable in
 * the route tree.
 */
import { ChatScreen } from '@/components/ai/ChatScreen';

export default function OwnerAIHelper() {
  return <ChatScreen pageTag="AIHelper(owner)" />;
}
