
import type { NotificationType } from "@/types/notifications";

export const formatNotificationMessage = (type: NotificationType, username: string) => {
  switch (type) {
    case 'friend_request':
      return `${username} quiere conectar contigo`;
    case 'idea_request':
      return `${username} quiere sumarse a tu idea`;
    case 'idea_accepted':
      return `${username} aceptó tu solicitud para sumarte a una idea`;
    case 'idea_rejected':
      return `${username} por ahora no pudo aceptar tu solicitud`;
    case 'idea_join':
      return `${username} se sumó a tu idea`;
    case 'idea_leave':
      return `${username} se retiró de tu idea`;
    case 'post_comment':
      return `${username} comentó en tu publicación`;
    case 'comment_reply':
      return `${username} respondió tu comentario`;
    case 'post_like':
      return `A ${username} le gustó tu publicación`;
    case 'new_post':
      return `${username} compartió algo nuevo`;
    case 'friend_accepted':
      return `${username} aceptó conectar contigo`;
    case 'mention':
      return `${username} te mencionó en una publicación`;
    default:
      return `Tienes novedades de ${username}`;
  }
};
