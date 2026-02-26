// 🚀 PÁGINA PRINCIPAL DEL FEED - IMPLEMENTACIÓN COMPLETA
// Ejemplo de uso del feed paginado por cursor con scroll infinito

import React, { useState } from 'react';
import { useInfiniteFeed, useFeedUtils } from '../hooks/useCursorPaginatedFeed_FIXED';
import InfiniteFeedComponent from './InfiniteFeedComponent';
import { Post } from '../hooks/useCursorPaginatedFeed_FIXED';

interface FeedPageProps {
  currentUserId?: string;
}

export const FeedPage: React.FC<FeedPageProps> = ({ currentUserId }) => {
  const [visibility, setVisibility] = useState<'public' | 'friends' | 'all'>('public');
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  const { refreshFeed } = useFeedUtils();

  // Manejar cambio de visibilidad
  const handleVisibilityChange = async (newVisibility: 'public' | 'friends' | 'all') => {
    setVisibility(newVisibility);
    await refreshFeed({ userId: currentUserId, visibility: newVisibility });
  };

  // Manejar click en post
  const handlePostClick = (post: Post) => {
    setSelectedPost(post);
    // Aquí puedes abrir un modal o navegar a la página del post
    console.log('Post clicked:', post);
  };

  // Manejar click en usuario
  const handleUserClick = (userId: string) => {
    // Navegar al perfil del usuario
    console.log('User clicked:', userId);
  };

  // Manejar like
  const handleLike = async (postId: string) => {
    console.log('Post liked:', postId);
    // La lógica de like ya está implementada en el hook
  };

  // Manejar comment
  const handleComment = async (postId: string) => {
    console.log('Comment on post:', postId);
    // Aquí puedes abrir un modal de comentarios
  };

  // Manejar share
  const handleShare = async (postId: string) => {
    console.log('Share post:', postId);
    // Aquí puedes implementar la lógica de compartir
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Feed</h1>
            
            {/* Selector de visibilidad */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => handleVisibilityChange('public')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  visibility === 'public'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Público
              </button>
              <button
                onClick={() => handleVisibilityChange('friends')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  visibility === 'friends'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Amigos
              </button>
              <button
                onClick={() => handleVisibilityChange('all')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  visibility === 'all'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Todos
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Componente del feed infinito */}
        <InfiniteFeedComponent
          userId={currentUserId}
          visibility={visibility}
          initialLimit={20}
          includePinned={true}
          onPostClick={handlePostClick}
          onUserClick={handleUserClick}
          onLike={handleLike}
          onComment={handleComment}
          onShare={handleShare}
        />

        {/* Modal para post seleccionado (opcional) */}
        {selectedPost && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Post</h2>
                  <button
                    onClick={() => setSelectedPost(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="space-y-4">
                  {/* Header del post */}
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {selectedPost.profiles?.username?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {selectedPost.profiles?.username || 'Usuario'}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {new Date(selectedPost.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Contenido */}
                  <div className="text-gray-800 whitespace-pre-wrap">
                    {selectedPost.content}
                  </div>

                  {/* Media */}
                  {selectedPost.media_url && (
                    <div className="rounded-lg overflow-hidden">
                      {selectedPost.media_type === 'image' ? (
                        <img
                          src={selectedPost.media_url}
                          alt="Post media"
                          className="w-full h-auto"
                        />
                      ) : selectedPost.media_type === 'video' ? (
                        <video
                          src={selectedPost.media_url}
                          controls
                          className="w-full h-auto"
                        />
                      ) : null}
                    </div>
                  )}

                  {/* Estadísticas */}
                  <div className="flex items-center space-x-6 text-gray-500">
                    <span>{selectedPost.reactions_count || 0} reacciones</span>
                    <span>{selectedPost.comments_count || 0} comentarios</span>
                    <span>{selectedPost.shares_count || 0} compartidos</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default FeedPage;
