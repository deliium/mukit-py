import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useWebSocket } from '../hooks/useWebSocket';
import ProseMirrorEditor from '../components/ProseMirrorEditor';
import { Document } from '../types';
// import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

const DocumentPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [content, setContent] = useState<object | string>('');
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);

  // WebSocket connection for real-time collaboration
  const documentId = id || '';
  const token = localStorage.getItem('token') || '';

  console.log('Document: Rendering with', {
    documentId,
    token: token ? 'present' : 'missing',
  });

  // Load document data
  useEffect(() => {
    const loadDocument = async () => {
      if (!documentId) return;

      try {
        setLoading(true);
        const response = await api.get(`/documents/${documentId}`);
        const docData = response.data;
        setDocument(docData);

        // Set initial content
        if (docData.content) setContent(docData.content);

        console.log('Document loaded:', docData);
      } catch (error) {
        console.error('Error loading document:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDocument();
  }, [documentId]);

  const { sendContentChange, connected } = useWebSocket({
    documentId,
    token,
    onContentChange: (newContent: any) => {
      console.log('Document: Content changed via WebSocket', newContent);
      setContent(newContent);
    },
  });

  // Debounced autosave
  const saveTimerRef = useRef<number | null>(null);
  const lastContentRef = useRef<object | string>('');

  const handleContentChange = (json: object) => {
    sendContentChange(json);
    lastContentRef.current = json;
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = window.setTimeout(async () => {
      try {
        if (!documentId) return;
        await api.put(`/documents/${documentId}`, { content: lastContentRef.current });
      } catch (e) {
        console.error('Autosave error:', e);
      }
    }, 600);
  };

  return (
    <div className='h-screen flex flex-col'>
      <div className='bg-white border-b px-6 py-4'>
        <div className='flex items-center justify-between'>
          <h1 className='text-2xl font-bold text-gray-900'>
            {loading ? 'Loading...' : document?.title || 'Untitled Document'}
          </h1>
          <div className='flex items-center space-x-2'>
            <div
              className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}
            />
            <span className='text-sm text-gray-600'>
              {connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>

      <div className='flex-1'>
        {loading ? (
          <div className='flex items-center justify-center h-full'>
            <div className='text-gray-500'>Loading document...</div>
          </div>
        ) : (
          <ProseMirrorEditor
            value={content}
            onChange={handleContentChange}
            className='h-full'
          />
        )}
      </div>
    </div>
  );
};

export default DocumentPage;
