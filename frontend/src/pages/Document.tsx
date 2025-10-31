import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  Cog6ToothIcon,
  XMarkIcon,
  GlobeAltIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';
import { useWebSocket } from '../hooks/useWebSocket';
import ProseMirrorEditor from '../components/ProseMirrorEditor';
import { Document } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

const DocumentPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [content, setContent] = useState<object | string>('');
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [updating, setUpdating] = useState(false);

  // WebSocket connection for real-time collaboration
  const documentId = id || '';
  const token = localStorage.getItem('token') || '';

  // Check if current user is the document owner
  const isOwner = user && document && user.id === document.owner_id;

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
        setIsPublic(docData.is_public || false);

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
        await api.put(`/documents/${documentId}`, {
          content: lastContentRef.current,
        });
      } catch (e) {
        console.error('Autosave error:', e);
      }
    }, 600);
  };

  const handleTogglePublic = async () => {
    if (!documentId || updating) return;

    try {
      setUpdating(true);
      const response = await api.put(`/documents/${documentId}`, {
        is_public: !isPublic,
      });
      setIsPublic(response.data.is_public);
      setDocument(response.data);
      setShowSettings(false);
    } catch (error: any) {
      console.error('Error updating document:', error);
      alert(error.response?.data?.detail || 'Failed to update document');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className='h-screen flex flex-col'>
      <div className='bg-white border-b px-6 py-4'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center space-x-3'>
            <h1 className='text-2xl font-bold text-gray-900'>
              {loading ? 'Loading...' : document?.title || 'Untitled Document'}
            </h1>
            {/* Public/Private indicator */}
            {!loading && (
              <div
                className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                  isPublic
                    ? 'bg-green-100 text-green-700 border border-green-200'
                    : 'bg-gray-100 text-gray-700 border border-gray-200'
                }`}
              >
                {isPublic ? (
                  <>
                    <GlobeAltIcon className='h-3.5 w-3.5' />
                    <span>Public</span>
                  </>
                ) : (
                  <>
                    <LockClosedIcon className='h-3.5 w-3.5' />
                    <span>Private</span>
                  </>
                )}
              </div>
            )}
          </div>
          <div className='flex items-center space-x-4'>
            <div className='flex items-center space-x-2'>
              <div
                className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}
              />
              <span className='text-sm text-gray-600'>
                {connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            {isOwner && (
              <button
                onClick={() => setShowSettings(true)}
                className='p-2 text-gray-400 hover:text-gray-600 transition-colors'
                title='Document settings'
              >
                <Cog6ToothIcon className='h-5 w-5' />
              </button>
            )}
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

      {/* Settings Modal */}
      {showSettings && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50'>
          <div className='bg-white rounded-lg shadow-xl max-w-md w-full mx-4'>
            <div className='flex items-center justify-between p-6 border-b'>
              <h2 className='text-xl font-semibold text-gray-900'>
                Document Settings
              </h2>
              <button
                onClick={() => setShowSettings(false)}
                className='text-gray-400 hover:text-gray-600'
              >
                <XMarkIcon className='h-5 w-5' />
              </button>
            </div>

            <div className='p-6 space-y-6'>
              {isOwner ? (
                <div className='flex items-center justify-between'>
                  <div>
                    <h3 className='text-sm font-medium text-gray-900'>
                      Public Document
                    </h3>
                    <p className='text-sm text-gray-500 mt-1'>
                      Allow anyone with the link to view this document
                    </p>
                  </div>
                  <label className='relative inline-flex items-center cursor-pointer'>
                    <input
                      type='checkbox'
                      checked={isPublic}
                      onChange={handleTogglePublic}
                      disabled={updating}
                      className='sr-only peer'
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>
              ) : (
                <div className='flex items-center justify-between'>
                  <div>
                    <h3 className='text-sm font-medium text-gray-900'>
                      Public Document
                    </h3>
                    <p className='text-sm text-gray-500 mt-1'>
                      {isPublic
                        ? 'This document is publicly accessible'
                        : 'This document is private'}
                    </p>
                  </div>
                  <div className='flex items-center space-x-2 px-3 py-1.5 bg-gray-100 rounded-md'>
                    {isPublic ? (
                      <>
                        <GlobeAltIcon className='h-4 w-4 text-gray-600' />
                        <span className='text-sm text-gray-600'>Public</span>
                      </>
                    ) : (
                      <>
                        <LockClosedIcon className='h-4 w-4 text-gray-600' />
                        <span className='text-sm text-gray-600'>Private</span>
                      </>
                    )}
                  </div>
                </div>
              )}

              <div className='flex justify-end space-x-3 pt-4 border-t'>
                <button
                  onClick={() => setShowSettings(false)}
                  className='px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200'
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentPage;
