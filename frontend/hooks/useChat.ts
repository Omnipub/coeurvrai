'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { api, API_URL, getToken } from '@/lib/api';
import type { ChatMessage } from '@/types';

type Ack = { ok?: boolean; error?: string; message?: ChatMessage };

/** Historique + messages temps réel d'une conversation. */
export function useChat(matchId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [closed, setClosed] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    let typingTimer: ReturnType<typeof setTimeout> | undefined;

    api<{ messages: ChatMessage[] }>(`/api/likes/matches/${matchId}/messages`)
      .then(({ messages }) => setMessages(messages))
      .catch((e: Error) => setError(e.message));

    const socket = io(API_URL, { auth: { token: getToken() } });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('chat:join', { matchId }, (res: Ack) => {
        if (res.error) setError(res.error);
        else socket.emit('chat:read', { matchId }, () => undefined);
      });
    });
    socket.on('chat:message', (message: ChatMessage) => {
      setMessages((prev) => [...prev, message]);
      setOtherTyping(false);
      socket.emit('chat:read', { matchId }, () => undefined);
    });
    socket.on('chat:typing', () => {
      setOtherTyping(true);
      clearTimeout(typingTimer);
      typingTimer = setTimeout(() => setOtherTyping(false), 3000);
    });
    socket.on('match:closed', () => setClosed(true));
    socket.on('connect_error', () => setError('Connexion au chat impossible'));

    return () => {
      clearTimeout(typingTimer);
      socket.disconnect();
    };
  }, [matchId]);

  const send = useCallback(
    (content: string) =>
      new Promise<void>((resolve, reject) => {
        socketRef.current?.emit('chat:message', { matchId, content }, (res: Ack) => {
          if (res.error || !res.message) return reject(new Error(res.error ?? 'Envoi impossible'));
          setMessages((prev) => [...prev, res.message!]);
          resolve();
        });
      }),
    [matchId],
  );

  const typing = useCallback(() => {
    socketRef.current?.emit('chat:typing', { matchId });
  }, [matchId]);

  return { messages, send, typing, error, closed, otherTyping };
}
