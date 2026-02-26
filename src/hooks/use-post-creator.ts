import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { searchUsersByUsername } from "@/lib/api/user";
import type { Visibility } from "@/lib/api/posts/types";

export function usePostCreator() {
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Menciones
  const [mentionUsers, setMentionUsers] = useState<any[]>([]);
  const [mentionListVisible, setMentionListVisible] = useState(false);
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [mentionIndex, setMentionIndex] = useState(0);
  
  // Campos adicionales para ideas
  const [ideaTitle, setIdeaTitle] = useState("");
  const [ideaDescription, setIdeaDescription] = useState("");
  
  // Cargar usuario actual
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, career, semester')
          .eq('id', user.id)
          .single();
          
        setCurrentUser(data);
      }
    };
    
    getCurrentUser();
  }, []);
  
  // Manejar cambio de textarea para menciones
  const handleTextAreaChange = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setContent(value);
    
    // Buscar menciones
    const lastAtSymbolIndex = value.lastIndexOf('@');
    if (lastAtSymbolIndex !== -1 && lastAtSymbolIndex < value.length) {
      const query = value.substring(lastAtSymbolIndex + 1);
      
      // Si hay texto después del @, buscar usuarios
      if (query.length > 1) {
        const cursorPosition = e.target.selectionStart;
        const textUpToCursor = value.substring(0, cursorPosition);
        
        // Solo buscar si el @ está antes del cursor
        if (textUpToCursor.includes('@' + query)) {
          // Calcular posición para mostrar la lista de menciones
          if (textareaRef.current) {
            const cursorCoords = getCaretCoordinates(textareaRef.current, cursorPosition);
            setMentionPosition({
              top: cursorCoords.top + 20,
              left: cursorCoords.left
            });
          }
          
          try {
            const results = await searchUsersByUsername(query);
            setMentionUsers(results);
            setMentionListVisible(results.length > 0);
            setMentionIndex(0); // Resetear el índice seleccionado
          } catch (error) {
            console.error("Error searching users:", error);
          }
        }
      } else {
        setMentionListVisible(false);
      }
    } else {
      setMentionListVisible(false);
    }
  };
  
  // Manejar teclas para navegación en lista de menciones
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (mentionListVisible) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex(prev => (prev + 1) % mentionUsers.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex(prev => (prev - 1 + mentionUsers.length) % mentionUsers.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        handleSelectMention(mentionUsers[mentionIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setMentionListVisible(false);
      }
    }
  };
  
  // Seleccionar una mención
  const handleSelectMention = (user: any) => {
    const lastAtSymbolIndex = content.lastIndexOf('@');
    const beforeMention = content.substring(0, lastAtSymbolIndex);
    const afterMention = content.substring(textareaRef.current?.selectionStart || content.length);
    
    // Insertar la mención con formato especial
    setContent(`${beforeMention}@${user.username} ${afterMention}`);
    setMentionListVisible(false);
    
    // Enfocar el textarea después de insertar la mención
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newCursorPos = `${beforeMention}@${user.username} `.length;
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };
  
  // Hacer clic en mención
  const handleMentionClick = (user: any) => {
    handleSelectMention(user);
  };
  
  // Manejar cambio de archivo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };
  
  return {
    content,
    setContent,
    file,
    setFile,
    showPollCreator,
    setShowPollCreator,
    visibility,
    setVisibility,
    currentUser,
    handleFileChange,
    textareaRef,
    mentionUsers,
    mentionListVisible,
    mentionPosition,
    mentionIndex,
    setMentionIndex,
    handleTextAreaChange,
    handleKeyDown,
    handleSelectMention,
    handleMentionClick,
    setMentionListVisible,
    ideaTitle,
    setIdeaTitle,
    ideaDescription,
    setIdeaDescription
  };
}

// Función auxiliar para calcular coordenadas del cursor
function getCaretCoordinates(element: HTMLTextAreaElement, position: number) {
  // Crear un elemento espejo para calcular la posición
  const mirror = document.createElement('div');
  // Copiar los estilos relevantes
  const style = window.getComputedStyle(element);
  
  mirror.style.width = style.width;
  mirror.style.height = style.height;
  mirror.style.fontSize = style.fontSize;
  mirror.style.fontFamily = style.fontFamily;
  mirror.style.fontWeight = style.fontWeight;
  mirror.style.lineHeight = style.lineHeight;
  mirror.style.padding = style.padding;
  mirror.style.border = style.border;
  mirror.style.position = 'absolute';
  mirror.style.left = '-9999px';
  mirror.style.top = '0';
  mirror.style.whiteSpace = 'pre-wrap';
  mirror.style.wordWrap = 'break-word';
  
  document.body.appendChild(mirror);
  
  // Obtener el texto hasta la posición del cursor
  const textBeforeCaret = element.value.substring(0, position);
  
  // Crear un span para marcar la posición del cursor
  mirror.textContent = textBeforeCaret;
  mirror.innerHTML += '<span id="cursor">|</span>';
  
  // Agregar el resto del texto después del cursor
  mirror.textContent += element.value.substring(position);
  
  // Obtener las coordenadas
  const cursorSpan = document.getElementById('cursor');
  const coordinates = {
    top: cursorSpan?.offsetTop || 0,
    left: cursorSpan?.offsetLeft || 0
  };
  
  // Limpiar
  document.body.removeChild(mirror);
  
  return coordinates;
}
