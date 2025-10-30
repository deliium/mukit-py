import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { api } from '../services/api';
import { Document, Workspace } from '../types';
import {
  PlusIcon,
  DocumentTextIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const WorkspacePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [showCreateDocument, setShowCreateDocument] = useState(false);
  const [newDocument, setNewDocument] = useState({
    title: '',
    description: '',
  });

  const { data: workspace, isLoading: workspaceLoading } = useQuery<Workspace>(
    ['workspace', id],
    () => api.get(`/workspaces/${id}`).then(res => res.data),
    { enabled: !!id }
  );

  const { data: documents, refetch: refetchDocuments } = useQuery<Document[]>(
    ['documents', id],
    () => api.get(`/documents?workspace_id=${id}`).then(res => res.data),
    { enabled: !!id }
  );

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/documents', {
        ...newDocument,
        workspace_id: parseInt(id!),
      });
      toast.success('Document created successfully!');
      setNewDocument({ title: '', description: '' });
      setShowCreateDocument(false);
      refetchDocuments();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to create document');
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (window.confirm('Are you sure you want to delete this document?')) {
      try {
        await api.delete(`/documents/${docId}`);
        toast.success('Document deleted successfully!');
        refetchDocuments();
      } catch (error: any) {
        toast.error(
          error.response?.data?.detail || 'Failed to delete document'
        );
      }
    }
  };

  if (workspaceLoading) {
    return (
      <div className='flex items-center justify-center h-64'>
        <div className='animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600'></div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className='text-center py-12'>
        <h2 className='text-2xl font-bold text-gray-900'>
          Workspace not found
        </h2>
        <p className='text-gray-500 mt-2'>
          The workspace you're looking for doesn't exist.
        </p>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <div className='flex justify-between items-center'>
        <div>
          <h1 className='text-2xl font-bold text-gray-900'>{workspace.name}</h1>
          <p className='text-gray-600'>{workspace.description}</p>
        </div>
        <button
          onClick={() => setShowCreateDocument(true)}
          className='btn-primary'
        >
          <PlusIcon className='h-4 w-4 mr-2' />
          New Document
        </button>
      </div>

      {/* Documents */}
      <div className='card p-6'>
        <h2 className='text-lg font-medium text-gray-900 mb-4'>Documents</h2>
        {documents?.length === 0 ? (
          <div className='text-center py-12'>
            <DocumentTextIcon className='mx-auto h-12 w-12 text-gray-400' />
            <h3 className='mt-2 text-sm font-medium text-gray-900'>
              No documents
            </h3>
            <p className='mt-1 text-sm text-gray-500'>
              Get started by creating a new document.
            </p>
          </div>
        ) : (
          <div className='space-y-3'>
            {documents?.map(document => (
              <div
                key={document.id}
                className='flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-primary-300 transition-colors'
              >
                <Link
                  to={`/document/${document.id}`}
                  className='flex items-center flex-1'
                >
                  <DocumentTextIcon className='h-6 w-6 text-primary-600 mr-3' />
                  <div>
                    <h3 className='font-medium text-gray-900'>
                      {document.title}
                    </h3>
                    <p className='text-sm text-gray-500'>
                      {document.description}
                    </p>
                  </div>
                </Link>
                <div className='flex space-x-2'>
                  <button className='text-gray-400 hover:text-gray-600'>
                    <PencilIcon className='h-4 w-4' />
                  </button>
                  <button
                    onClick={() => handleDeleteDocument(document.id)}
                    className='text-gray-400 hover:text-red-600'
                  >
                    <TrashIcon className='h-4 w-4' />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Document Modal */}
      {showCreateDocument && (
        <div className='fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50'>
          <div className='bg-white rounded-lg p-6 w-full max-w-md'>
            <h3 className='text-lg font-medium text-gray-900 mb-4'>
              Create Document
            </h3>
            <form onSubmit={handleCreateDocument}>
              <div className='space-y-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-700'>
                    Title
                  </label>
                  <input
                    type='text'
                    required
                    className='input mt-1'
                    value={newDocument.title}
                    onChange={e =>
                      setNewDocument({ ...newDocument, title: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700'>
                    Description
                  </label>
                  <textarea
                    className='input mt-1'
                    rows={3}
                    value={newDocument.description}
                    onChange={e =>
                      setNewDocument({
                        ...newDocument,
                        description: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div className='flex justify-end space-x-3 mt-6'>
                <button
                  type='button'
                  onClick={() => setShowCreateDocument(false)}
                  className='btn-secondary'
                >
                  Cancel
                </button>
                <button type='submit' className='btn-primary'>
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkspacePage;
