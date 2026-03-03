import React, { useState, useRef, useEffect } from 'react';
import { useGlobalSearch } from '@/hooks/useGlobalSearch';
import { Search, User, FileText, Hash, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { normalizePostContent } from "@/utils/post-content";

export function GlobalSearchBar() {
  const { 
    query, 
    setQuery, 
    profileResults, 
    postResults, 
    channelResults, 
    isLoading 
  } = useGlobalSearch();
  
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleResultClick = (type: string, id: string) => {
    setIsOpen(false);
    setQuery('');
    
    switch (type) {
      case 'profile':
        router.push(`/profile/${id}`);
        break;
      case 'post':
        router.push(`/post/${id}`);
        break;
      case 'channel':
        router.push(`/channel/${id}`);
        break;
    }
  };

  const hasResults = profileResults.length > 0 || postResults.length > 0 || channelResults.length > 0;
  const showResults = isOpen && (query.length >= 3 || hasResults);

  return (
    <div className="relative w-full max-w-2xl mx-4" ref={searchRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar perfiles, publicaciones, canales..."
          className="flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => query.length > 0 && setIsOpen(true)}
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {showResults && (
        <div className="absolute z-50 mt-2 w-full rounded-md border bg-popover text-popover-foreground shadow-lg animate-in fade-in-0 zoom-in-95">
          <div className="p-2">
            {isLoading ? (
              <div className="flex items-center justify-center p-4 text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Buscando...
              </div>
            ) : hasResults ? (
              <>
                {profileResults.length > 0 && (
                  <div className="mb-4">
                    <h3 className="px-2 py-1 text-xs font-medium text-muted-foreground flex items-center">
                      <User className="h-3.5 w-3.5 mr-2" />
                      Perfiles
                    </h3>
                    <div className="mt-1">
                      {profileResults.map((profile) => (
                        <div
                          key={profile.id}
                          className="flex items-center px-3 py-2 text-sm rounded-md hover:bg-accent cursor-pointer transition-colors"
                          onClick={() => handleResultClick('profile', profile.id)}
                        >
                          <Avatar className="h-8 w-8 mr-3">
                            <AvatarImage src={profile.avatar_url} />
                            <AvatarFallback>
                              {profile.username?.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{profile.username}</p>
                            {profile.full_name && (
                              <p className="text-xs text-muted-foreground">
                                {profile.full_name}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {postResults.length > 0 && (
                  <div className="mb-4">
                    <h3 className="px-2 py-1 text-xs font-medium text-muted-foreground flex items-center">
                      <FileText className="h-3.5 w-3.5 mr-2" />
                      Publicaciones
                    </h3>
                    <div className="mt-1 space-y-1">
                      {postResults.map((post) => (
                        <div
                          key={post.id}
                          className="px-3 py-2 text-sm rounded-md hover:bg-accent cursor-pointer transition-colors"
                          onClick={() => handleResultClick('post', post.id)}
                        >
                          <p className="line-clamp-2 whitespace-pre-wrap break-words">{normalizePostContent(post.content)}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(post.created_at), { 
                              addSuffix: true, 
                              locale: es 
                            })}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {channelResults.length > 0 && (
                  <div>
                    <h3 className="px-2 py-1 text-xs font-medium text-muted-foreground flex items-center">
                      <Hash className="h-3.5 w-3.5 mr-2" />
                      Canales
                    </h3>
                    <div className="mt-1 space-y-1">
                      {channelResults.map((channel) => (
                        <div
                          key={channel.id}
                          className="px-3 py-2 text-sm rounded-md hover:bg-accent cursor-pointer transition-colors"
                          onClick={() => handleResultClick('channel', channel.id)}
                        >
                          <p className="font-medium">#{channel.nombre}</p>
                          {channel.descripcion && (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {channel.descripcion}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="p-4 text-center text-muted-foreground text-sm">
                No se encontraron resultados para "{query}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
