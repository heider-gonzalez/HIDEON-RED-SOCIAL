
import { supabase } from "@/integrations/supabase/client";
import { uploadMediaFile, getMediaType } from "../storage";
import { processPostData, processMediaData } from "./data-processors";
import type { CreatePostParams, CreatePostResponse, PollData, IdeaData, MarketplaceData } from "../types";
import { requireAuthUser } from "@/lib/auth/auth-store";

// Process poll data into the format expected by the database
function processPollData(pollData: PollData) {
  const processedPoll = {
    question: pollData.question,
    options: pollData.options.map((option, index) => ({
      id: index,
      text: option,
      content: option, // Add content for compatibility
      votes: 0
    })),
    total_votes: 0,
    user_vote: null
  };
  
  return processedPoll;
}

// Process idea data into the format expected by the database
function processIdeaData(ideaData: IdeaData) {
  return {
    title: ideaData.title,
    description: ideaData.description || "",
    participants: ideaData.participants || []
  };
}

// Process marketplace data into the format expected by the database
function processMarketplaceData(marketplaceData: MarketplaceData) {
  return {
    title: marketplaceData.title,
    description: marketplaceData.description,
    subject: marketplaceData.subject,
    price: marketplaceData.price,
    document_preview_url: marketplaceData.document_preview_url || null,
    document_full_url: marketplaceData.document_full_url || null,
    contact_info: marketplaceData.contact_info || null
  };
}

export async function createPost({
  content,
  file,
  pollData,
  ideaData,
  marketplaceData,
  visibility = "public"
}: CreatePostParams): Promise<CreatePostResponse> {
  try {
    // Enhanced authentication check
    const user = requireAuthUser();

    // Validate input data
    if (!content?.trim() && !file && !pollData && !ideaData && !marketplaceData) {
      throw new Error("El post debe tener contenido, archivo o datos especiales");
    }

    let mediaUrl = null;
    let mediaType: 'image' | 'video' | 'audio' | null = null;

    // Upload media if file exists
    if (file) {
      mediaUrl = await uploadMediaFile(file);
      if (mediaUrl) {
        const detected = getMediaType(file);
        // Media type is already properly typed to exclude 'file'
        mediaType = detected;
      }
    }

    // Process poll data
    let processedPollData = null;
    if (pollData) {
      processedPollData = processPollData(pollData);
    }

    // Process idea data
    let processedIdeaData = null;
    if (ideaData) {
      processedIdeaData = processIdeaData(ideaData);
    }

    // Process marketplace data
    let processedMarketplaceData = null;
    if (marketplaceData) {
      processedMarketplaceData = processMarketplaceData(marketplaceData);
      // For marketplace posts, the document URL becomes the media URL
      if (mediaUrl) {
        processedMarketplaceData.document_preview_url = mediaUrl;
        processedMarketplaceData.document_full_url = mediaUrl; // In a real app, this would be different
      }
    }

    // Determine post type
    let postType = 'regular';
    if (pollData) postType = 'poll';
    else if (ideaData) postType = 'idea';
    else if (marketplaceData) postType = 'marketplace';

    // Handle incognito posts differently
    if (visibility === 'incognito') {
      // For incognito posts, we need to create an entry in the incognito_posts table
      const { data: post, error: postError } = await (supabase as any)
        .from('posts')
        .insert({
          content: content || null,
          user_id: user.id,
          media_url: mediaUrl,
          media_type: mediaType,
          visibility: 'private', // Store as private but mark as incognito
          poll: processedPollData,
          idea: processedIdeaData,
          marketplace: processedMarketplaceData,
          post_type: postType
        } as any)
        .select()
        .single();

      if (postError) {
        console.error("Error creating incognito post:", postError);
        throw postError;
      }

      // Incognito mode disabled (table removed)
      return { success: true, post };
    } else {
      // Regular post creation
      const { data: post, error: postError } = await (supabase as any)
        .from('posts')
        .insert({
          content: content || null,
          user_id: user.id,
          media_url: mediaUrl,
          media_type: mediaType,
          visibility: visibility,
          poll: processedPollData,
          idea: processedIdeaData,
          marketplace: processedMarketplaceData,
          post_type: postType
        } as any)
        .select()
        .single();

      if (postError) {
        console.error("Error creating regular post:", postError);
        throw postError;
      }

      return { success: true, post };
    }
  } catch (error) {
    console.error("❌ Error creating post:", error);
    
    // Enhanced error handling
    let errorMessage = "Error desconocido al crear la publicación";
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Handle specific Supabase errors
      if (error.message.includes('row-level security')) {
        errorMessage = "No tienes permisos para crear esta publicación";
      } else if (error.message.includes('violates not-null constraint')) {
        errorMessage = "Faltan datos requeridos para crear la publicación";
      } else if (error.message.includes('duplicate key')) {
        errorMessage = "Ya existe una publicación similar";
      }
    }
    
    return { 
      success: false, 
      error: errorMessage
    };
  }
}
