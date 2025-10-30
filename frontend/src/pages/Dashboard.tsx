import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { Document, Workspace } from '../types';
import {
  PlusIcon,
  DocumentTextIcon,
  FolderIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export const Dashboard: React.FC = () => {
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
  const [showCreateDocument, setShowCreateDocument] = useState(false);
  const [newWorkspace, setNewWorkspace] = useState({
    name: '',
    description: '',
    slug: '',
  });
  const [newDocument, setNewDocument] = useState({
    title: '',
    description: '',
  });

  const { data: workspaces, refetch: refetchWorkspaces } = useQuery<
    Workspace[]
  >('workspaces', () => api.get('/workspaces').then(res => res.data));

  const { data: documents, refetch: refetchDocuments } = useQuery<Document[]>(
    'documents',
    () => api.get('/documents').then(res => res.data)
  );

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/workspaces', newWorkspace);
      toast.success('Workspace created successfully!');
      setNewWorkspace({ name: '', description: '', slug: '' });
      setShowCreateWorkspace(false);
      refetchWorkspaces();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to create workspace');
    }
  };

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/documents', newDocument);
      toast.success('Document created successfully!');
      setNewDocument({ title: '', description: '' });
      setShowCreateDocument(false);
      refetchDocuments();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to create document');
    }
  };

  const handleDeleteDocument = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this document?')) {
      try {
        await api.delete(`/documents/${id}`);
        toast.success('Document deleted successfully!');
        refetchDocuments();
      } catch (error: any) {
        toast.error(
          error.response?.data?.detail || 'Failed to delete document'
        );
      }
    }
  };

  return (
    <div className='space-y-6'>
      <div className='flex justify-between items-center'>
        <h1 className='text-2xl font-bold text-gray-900'>Dashboard</h1>
        <div className='flex space-x-3'>
          <button
            onClick={() => setShowCreateWorkspace(true)}
            className='btn-primary'
          >
            <PlusIcon className='h-4 w-4 mr-2' />
            New Workspace
          </button>
          <button
            onClick={() => setShowCreateDocument(true)}
            className='btn-primary'
          >
            <PlusIcon className='h-4 w-4 mr-2' />
            New Document
          </button>
        </div>
      </div>

      {/* Workspaces */}
      <div className='card p-6'>
        <h2 className='text-lg font-medium text-gray-900 mb-4'>Workspaces</h2>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
          {workspaces?.map(workspace => (
            <Link
              key={workspace.id}
              to={`/workspace/${workspace.id}`}
              className='block p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:shadow-md transition-colors'
            >
              <div className='flex items-center'>
                <FolderIcon className='h-8 w-8 text-primary-600 mr-3' />
                <div>
                  <h3 className='font-medium text-gray-900'>
                    {workspace.name}
                  </h3>
                  <p className='text-sm text-gray-500'>
                    {workspace.description}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Documents */}
      <div className='card p-6'>
        <h2 className='text-lg font-medium text-gray-900 mb-4'>
          Recent Documents
        </h2>
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
      </div>

      {/* Create Workspace Modal */}
      {showCreateWorkspace && (
        <div className='fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50'>
          <div className='bg-white rounded-lg p-6 w-full max-w-md'>
            <h3 className='text-lg font-medium text-gray-900 mb-4'>
              Create Workspace
            </h3>
            <form onSubmit={handleCreateWorkspace}>
              <div className='space-y-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-700'>
                    Name
                  </label>
                  <input
                    type='text'
                    required
                    className='input mt-1'
                    value={newWorkspace.name}
                    onChange={e =>
                      setNewWorkspace({ ...newWorkspace, name: e.target.value })
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
                    value={newWorkspace.description}
                    onChange={e =>
                      setNewWorkspace({
                        ...newWorkspace,
                        description: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700'>
                    Slug
                  </label>
                  <input
                    type='text'
                    required
                    className='input mt-1'
                    value={newWorkspace.slug}
                    onChange={e =>
                      setNewWorkspace({ ...newWorkspace, slug: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className='flex justify-end space-x-3 mt-6'>
                <button
                  type='button'
                  onClick={() => setShowCreateWorkspace(false)}
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
