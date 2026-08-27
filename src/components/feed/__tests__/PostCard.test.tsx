import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PostCard } from '../PostCard';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

// Mock dependencies
jest.mock('@/hooks/use-user', () => ({
  useUser: () => ({
    user: { id: 'test-user-id' },
  }),
}));

jest.mock('@/components/video/FullscreenVideoContext', () => ({
  useFullscreenVideo: () => ({
    open: jest.fn(),
  }),
}));

jest.mock('@/utils/post-content', () => ({
  normalizePostContent: (content: string) => content,
}));

jest.mock('@/lib/hybrid-url', () => ({
  getHybridUrl: (url: string) => url,
}));

jest.mock('./LikeButton', () => ({
  LikeButton: ({ postId, userId }: { postId: string; userId: string }) => 
    React.createElement('button', { 'data-testid': 'like-button' }, 'Like'),
}));

jest.mock('./CommentForm', () => ({
  CommentForm: ({ postId, userId, onAddComment }: any) => 
    React.createElement('div', { 'data-testid': 'comment-form' }, 'Comment Form'),
}));

jest.mock('./CommentList', () => ({
  CommentList: ({ postId }: { postId: string }) => 
    React.createElement('div', { 'data-testid': 'comment-list' }, 'Comment List'),
}));

jest.mock('@/components/post/MediaLightbox', () => ({
  MediaLightbox: ({ isOpen, onClose }: any) =>
    isOpen ? React.createElement('div', { 'data-testid': 'lightbox' }, 'Lightbox') : null,
}));

const mockPost = {
  id: '1',
  content: 'Test post content',
  author_id: 'user-1',
  user_id: 'user-1',
  created_at: '2023-01-01T00:00:00.000Z',
  updated_at: '2023-01-01T00:00:00.000Z',
  media_url: 'https://example.com/image.jpg',
  media_type: 'image',
  reactions: [],
  reactions_count: 0,
  comments_count: 0,
  shares_count: 0,
  profiles: {
    id: 'user-1',
    username: 'testuser',
    avatar_url: 'https://example.com/avatar.jpg',
    career: 'Engineer',
    institution: 'Test University',
  },
};

const createTestWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => 
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(BrowserRouter, null, children)
    );
};

describe('PostCard', () => {
  it('should render post content', () => {
    const wrapper = createTestWrapper();
    render(React.createElement(PostCard, { post: mockPost as any }), { wrapper });
    
    expect(screen.getByText('@testuser')).toBeInTheDocument();
    expect(screen.getByText('Test post content')).toBeInTheDocument();
    expect(screen.getByText('Engineer')).toBeInTheDocument();
    expect(screen.getByText('Test University')).toBeInTheDocument();
  });

  it('should render like button', () => {
    const wrapper = createTestWrapper();
    render(React.createElement(PostCard, { post: mockPost as any }), { wrapper });
    
    expect(screen.getByTestId('like-button')).toBeInTheDocument();
  });

  it('should toggle comments section when comment button is clicked', async () => {
    const wrapper = createTestWrapper();
    render(React.createElement(PostCard, { post: mockPost as any }), { wrapper });
    
    const commentButton = screen.getByText(/comentar/i);
    expect(screen.queryByTestId('comment-list')).not.toBeInTheDocument();
    
    await userEvent.click(commentButton);
    
    await waitFor(() => {
      expect(screen.getByTestId('comment-list')).toBeInTheDocument();
    });
  });

  it('should render formatted date', () => {
    const wrapper = createTestWrapper();
    render(React.createElement(PostCard, { post: mockPost as any }), { wrapper });
    
    // The date should be formatted in Spanish
    expect(screen.getByText(/enero/i)).toBeInTheDocument();
  });

  it('should open lightbox when image is clicked', async () => {
    const wrapper = createTestWrapper();
    render(React.createElement(PostCard, { post: mockPost as any }), { wrapper });
    
    const image = screen.getByRole('img');
    await userEvent.click(image);
    
    await waitFor(() => {
      expect(screen.getByTestId('lightbox')).toBeInTheDocument();
    });
  });

  it('should handle posts without media', () => {
    const postWithoutMedia = { ...mockPost, media_url: null };
    const wrapper = createTestWrapper();
    render(React.createElement(PostCard, { post: postWithoutMedia as any }), { wrapper });
    
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('should handle posts without profile data', () => {
    const postWithoutProfile = { ...mockPost, profiles: undefined };
    const wrapper = createTestWrapper();
    render(React.createElement(PostCard, { post: postWithoutProfile as any }), { wrapper });
    
    expect(screen.getByText('Test post content')).toBeInTheDocument();
  });
});