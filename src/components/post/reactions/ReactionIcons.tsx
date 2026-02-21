// 3 tipos de reacciones para H Social

import { Handshake, Heart, Lightbulb, Smile, Star } from "lucide-react";

export const reactionIcons = {
  love: {
    icon: Heart,
    color: "text-red-600",
    label: "Me encanta",
    emoji: "❤️",
    animationClass: "reaction-love",
    size: "text-3xl",
  },
  awesome: {
    icon: Lightbulb,
    color: "text-amber-600",
    label: "Buena idea",
    emoji: "💡",
    animationClass: "reaction-awesome",
    size: "text-3xl",
  },
  incredible: {
    icon: Handshake,
    color: "text-emerald-600",
    label: "Colaborar",
    emoji: "🤝",
    animationClass: "reaction-incredible",
    size: "text-3xl",
  },
  funny: {
    icon: Smile,
    color: "text-fuchsia-600",
    label: "XD",
    emoji: "😆",
    animationClass: "reaction-funny",
    size: "text-3xl",
  },
  surprised: {
    icon: Star,
    color: "text-purple-600",
    label: "Genio",
    emoji: "🤯",
    animationClass: "reaction-surprised",
    size: "text-3xl",
  },
} as const;

export type ReactionType = keyof typeof reactionIcons;

export function normalizeReactionType(type: string | null | undefined): ReactionType {
  const t = (type || "").toLowerCase().trim();

  const aliasMap: Record<string, ReactionType> = {
    like: "love",
    liked: "love",
    me_gusta: "love",
    megusta: "love",
    gusta: "love",
    love: "love",
    encanta: "love",
    corazon: "love",

    awesome: "awesome",
    interesante: "awesome",
    idea: "awesome",
    buena_idea: "awesome",
    buen_idea: "awesome",
    bombilla: "awesome",

    incredible: "incredible",
    apoyo: "incredible",
    apoyar: "incredible",
    colaborar: "incredible",
    teamwork: "incredible",

    funny: "funny",
    celebrar: "funny",
    xd: "funny",
    risa: "funny",
    reir: "funny",
    divertido: "funny",

    surprised: "surprised",
    util: "surprised",
    útil: "surprised",
    genio: "surprised",
    asombro: "surprised",
    wow: "surprised",
  };

  return aliasMap[t] || "love";
}