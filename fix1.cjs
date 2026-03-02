const fs = require('fs');
const filePath = 'C:\\Proyectos\\RED SOCIAL HSOCIAL\\src\\components\\chat\\PrivateMessages.tsx';

let content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');

content = content.replace(
  'import { useState, useEffect, useMemo, useRef } from "react";',
  'import React, { useState, useEffect, useMemo, useRef } from "react";'
);

const START = '\n  // Componente para renderizar cada conversaci\u00f3n en virtualizaci\u00f3n\n  const ConversationItem = ({ index, style }: { index: number; style: React.CSSProperties }) => {';
const END_SUFFIX = '\n  };';
const END_CTX = '\n  };\n\n  if (loading && conversations.length === 0) {';

const si = content.indexOf(START);
if (si === -1) throw new Error('ConversationItem start not found');
const ei = content.indexOf(END_CTX, si);
if (ei === -1) throw new Error('ConversationItem end not found');

const sectionEnd = ei + END_SUFFIX.length;
const section = content.slice(si, sectionEnd);

const bodyStartOff = section.indexOf('=> {\n') + '=> {\n'.length;
const bodyEndOff = section.lastIndexOf('\n  };');
const bodyRaw = section.slice(bodyStartOff, bodyEndOff);

const bodyModuleScope = bodyRaw.split('\n').map(line => {
  if (line.startsWith('  ')) return line.slice(2);
  return line;
}).join('\n');

const newComp = `
interface ConversationItemProps {
  index: number;
  style: React.CSSProperties;
  visibleConversations: Conversation[];
  markAsRead: (id: string) => void;
  setSelectedConversation: (id: string | null) => void;
  selectedConversation: string | null;
  handleChatLongPress: (id: string) => void;
  handleChatPressEnd: () => void;
  onlineUsers: Map<string, { isOnline: boolean }>;
  activeInboxTab: 'inbox' | 'requests' | 'archived';
  setAcceptedRequests: React.Dispatch<React.SetStateAction<Set<string>>>;
  setActiveInboxTab: (tab: 'inbox' | 'requests' | 'archived') => void;
  archivedChats: Set<string>;
  handleUnarchiveChat: (id: string) => void;
}

const ConversationItem = ({ index, style, visibleConversations, markAsRead, setSelectedConversation, selectedConversation, handleChatLongPress, handleChatPressEnd, onlineUsers, activeInboxTab, setAcceptedRequests, setActiveInboxTab, archivedChats, handleUnarchiveChat }: ConversationItemProps) => {
${bodyModuleScope}
};
`;

content = content.slice(0, si) + content.slice(sectionEnd);

const INSERT_BEFORE = '\nexport function PrivateMessages() {';
const ii = content.indexOf(INSERT_BEFORE);
if (ii === -1) throw new Error('PrivateMessages insertion point not found');

content = content.slice(0, ii) + newComp + content.slice(ii);

fs.writeFileSync(filePath, content.replace(/\n/g, '\r\n'), 'utf8');
console.log('fix1.cjs done!');
