import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OptimizedImage } from '../OptimizedImage';

describe('OptimizedImage', () => {
  const mockSrc = 'https://example.com/test-image.jpg';
  const mockAlt = 'Test image';

  it('should render image when in view and loaded', async () => {
    render(React.createElement(OptimizedImage, { 
      src: mockSrc, 
      alt: mockAlt, 
      loading: "eager" 
    }));
    
    const img = screen.getByRole('img');
    expect(img).toBeTruthy();
    expect(img.getAttribute('src')).toBe(mockSrc);
    expect(img.getAttribute('alt')).toBe(mockAlt);
  });

  it('should apply custom className', () => {
    render(React.createElement(OptimizedImage, { 
      src: mockSrc, 
      alt: mockAlt, 
      className: "custom-class",
      loading: "eager"
    }));
    
    const container = screen.getByRole('img')?.closest('div');
    expect(container?.className).toContain('custom-class');
  });

  it('should handle onClick callback', async () => {
    const mockOnClick = jest.fn();
    render(React.createElement(OptimizedImage, { 
      src: mockSrc, 
      alt: mockAlt, 
      onClick: mockOnClick,
      loading: "eager"
    }));
    
    const container = screen.getByRole('img')?.closest('div');
    if (container) {
      await userEvent.click(container);
    }
    
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('should set custom width and height', () => {
    render(React.createElement(OptimizedImage, { 
      src: mockSrc, 
      alt: mockAlt, 
      width: 300,
      height: 200,
      loading: "eager"
    }));
    
    const container = screen.getByRole('img')?.closest('div');
    expect(container?.style.width).toBe('300px');
    expect(container?.style.height).toBe('200px');
  });
});