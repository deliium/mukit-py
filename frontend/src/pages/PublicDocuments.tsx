import React from 'react';
import { Link } from 'react-router-dom';
import { DocumentTextIcon, GlobeAltIcon } from '@heroicons/react/24/outline';
import { api } from '../services/api';
import { Document } from '../types';
import { useQuery } from 'react-query';

const PublicDocumentsPage: React.FC = () => {
  const {
    data: documents,
    isLoading,
    error,
    refetch,
  } = useQuery<Document[]>(
    'publicDocuments',
    async () => {
      const response = await api.get('/documents/public');
      return response.data;
    },
    {
      refetchOnWindowFocus: false,
    }
  );

  return (
    <div className='space-y-6'>
      <div className='flex justify-between items-center'>
        <div>
          <h1 className='text-2xl font-bold text-gray-900'>Public Documents</h1>
          <p className='text-sm text-gray-500 mt-1'>
            Browse and edit publicly available documents
          </p>
        </div>
      </div>

      {/* Public Documents List */}
      <div className='card p-6'>
        {isLoading ? (
          <div className='text-center py-12'>
            <div className='text-gray-500'>Loading public documents...</div>
          </div>
        ) : error ? (
          <div className='text-center py-12'>
            <div className='text-red-500'>Error loading public documents</div>
            <button
              onClick={() => refetch()}
              className='mt-4 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700'
            >
              Retry
            </button>
          </div>
        ) : documents?.length === 0 ? (
          <div className='text-center py-12'>
            <GlobeAltIcon className='mx-auto h-12 w-12 text-gray-400' />
            <h3 className='mt-2 text-sm font-medium text-gray-900'>
              No public documents
            </h3>
            <p className='mt-1 text-sm text-gray-500'>
              There are no publicly available documents yet.
            </p>
          </div>
        ) : (
          <div className='space-y-3'>
            {documents?.map(document => (
              <Link
                key={document.id}
                to={`/document/${document.id}`}
                className='flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-primary-300 transition-colors'
              >
                <div className='flex items-center flex-1'>
                  <DocumentTextIcon className='h-6 w-6 text-primary-600 mr-3' />
                  <div>
                    <h3 className='font-medium text-gray-900'>
                      {document.title}
                    </h3>
                    {document.description && (
                      <p className='text-sm text-gray-500 mt-1'>
                        {document.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className='flex items-center space-x-2'>
                  <div className='flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200'>
                    <GlobeAltIcon className='h-3.5 w-3.5' />
                    <span>Public</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicDocumentsPage;
