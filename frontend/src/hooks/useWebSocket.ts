import { useEffect, useRef, useState } from 'react';

// interface WebSocketMessage {
//   type: string;
//   content?: any;
//   user?: any;
//   users?: any[];
//   position?: any;
//   selection?: any;
//   timestamp?: string;
//   message?: string;
// }

interface UseWebSocketProps {
  documentId: string;
  token: string;
  onContentChange?: (content: any, user: any) => void;
  onCursorPosition?: (position: any, user: any) => void;
  onSelectionChange?: (selection: any, user: any) => void;
  onUserJoined?: (user: any) => void;
  onUserLeft?: (user: any) => void;
  onDocumentUsers?: (users: any[]) => void;
}

export const useWebSocket = ({
  documentId,
  token,
  onContentChange,
  onCursorPosition,
  onSelectionChange,
  onUserJoined,
  onUserLeft,
  onDocumentUsers,
}: UseWebSocketProps) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const socketRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef({
    onContentChange,
    onCursorPosition,
    onSelectionChange,
    onUserJoined,
    onUserLeft,
    onDocumentUsers,
  });

  // Keep latest handlers without re-creating the socket
  useEffect(() => {
    handlersRef.current = {
      onContentChange,
      onCursorPosition,
      onSelectionChange,
      onUserJoined,
      onUserLeft,
      onDocumentUsers,
    };
  }, [
    onContentChange,
    onCursorPosition,
    onSelectionChange,
    onUserJoined,
    onUserLeft,
    onDocumentUsers,
  ]);

  useEffect(() => {
    if (!documentId || !token) {
      console.log('WebSocket: Missing documentId or token', {
        documentId,
        token: token ? 'present' : 'missing',
      });
      return;
    }

    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8888';
    const wsPath = wsUrl
      .replace('http://', 'ws://')
      .replace('https://', 'wss://');
    const wsUrl_full = `${wsPath}/api/v1/documents/${documentId}/ws?token=${token}`;

    console.log('WebSocket: Attempting to connect to', wsUrl_full);
    // Avoid duplicate sockets in React Strict Mode/dev HMR
    if (
      socketRef.current &&
      socketRef.current.url === wsUrl_full &&
      (socketRef.current.readyState === WebSocket.OPEN ||
        socketRef.current.readyState === WebSocket.CONNECTING)
    ) {
      console.log('WebSocket: Reuse existing connection');
      setSocket(socketRef.current);
      setConnected(socketRef.current.readyState === WebSocket.OPEN);
      return;
    }

    const newSocket = new WebSocket(wsUrl_full);

    newSocket.onopen = () => {
      console.log('WebSocket: Connected successfully');
      setConnected(true);
    };

    newSocket.onclose = event => {
      console.log('WebSocket: Disconnected', event.code, event.reason);
      setConnected(false);
    };

    newSocket.onerror = error => {
      console.error('WebSocket: Error occurred', error);
    };

    newSocket.onmessage = event => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case 'content_change':
            if (handlersRef.current.onContentChange) {
              handlersRef.current.onContentChange(data.content, data.user);
            }
            break;
          case 'cursor_position':
            if (handlersRef.current.onCursorPosition) {
              handlersRef.current.onCursorPosition(data.position, data.user);
            }
            break;
          case 'selection_change':
            if (handlersRef.current.onSelectionChange) {
              handlersRef.current.onSelectionChange(data.selection, data.user);
            }
            break;
          case 'user_joined':
            if (handlersRef.current.onUserJoined) {
              handlersRef.current.onUserJoined(data.user);
            }
            break;
          case 'user_left':
            if (handlersRef.current.onUserLeft) {
              handlersRef.current.onUserLeft(data.user);
            }
            break;
          case 'document_users':
            setUsers(data.users);
            if (handlersRef.current.onDocumentUsers) {
              handlersRef.current.onDocumentUsers(data.users);
            }
            break;
          default:
            console.log('Unknown message type:', data.type);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    // Use setTimeout to avoid calling setState synchronously within an effect
    setTimeout(() => {
      setSocket(newSocket);
    }, 0);
    socketRef.current = newSocket;

    return () => {
      // Only close if this cleanup corresponds to the active socket
      if (socketRef.current === newSocket) {
        newSocket.close();
      }
    };
  }, [documentId, token]);

  const sendContentChange = (content: any) => {
    if (socket && connected) {
      socket.send(
        JSON.stringify({
          type: 'content_change',
          content,
          timestamp: new Date().toISOString(),
        })
      );
    }
  };

  const sendCursorPosition = (position: any) => {
    if (socket && connected) {
      socket.send(
        JSON.stringify({
          type: 'cursor_position',
          position,
        })
      );
    }
  };

  const sendSelectionChange = (selection: any) => {
    if (socket && connected) {
      socket.send(
        JSON.stringify({
          type: 'selection_change',
          selection,
        })
      );
    }
  };

  return {
    socket,
    connected,
    users,
    sendContentChange,
    sendCursorPosition,
    sendSelectionChange,
  };
};
