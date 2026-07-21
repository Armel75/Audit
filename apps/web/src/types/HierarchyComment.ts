// Interface partagée pour un commentaire hiérarchique
export interface HierarchyComment {
  id: number;
  type: HierarchyCommentType;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: {
    id: number;
    firstName: string;
    lastName: string;
    role?: string;
  };
  attachments?: Array<{
    id: number;
    name: string;
    url: string;
  }>;
  deletedAt?: string | null;
}
import { Users, User, MessageCircle } from 'lucide-react';

// Types de commentaires hiérarchiques supportés
export type HierarchyCommentType =
  | 'DIRECTOR_CONCLUSION'
  | 'MANAGER_OBSERVATION'
  | 'INTERNAL_DISCUSSION';

// Mapping type → label/icone premium (lucide-react)
export const hierarchyCommentTypeMeta: Record<HierarchyCommentType, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = {
  DIRECTOR_CONCLUSION: {
    label: 'Conclusions direction',
    icon: Users // Groupe/direction
  },
  MANAGER_OBSERVATION: {
    label: 'Observations managers',
    icon: User // Manager individuel
  },
  INTERNAL_DISCUSSION: {
    label: 'Discussions internes',
    icon: MessageCircle // Discussion interne
  }
};
