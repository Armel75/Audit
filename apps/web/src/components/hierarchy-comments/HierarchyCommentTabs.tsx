import React, { useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { HierarchyCommentType, hierarchyCommentTypeMeta } from '../../types/HierarchyComment';
import { PremiumTabs } from './PremiumTabs';
import { HierarchyCommentList } from './HierarchyCommentList';
import { HierarchyCommentForm } from './HierarchyCommentForm';
import { useHierarchyComments } from './useHierarchyComments';

interface HierarchyCommentTabsProps {
  contextType: string;
  contextId: number;
  availableTypes?: HierarchyCommentType[]; // Optionnel : filtrer les types affichés
  children?: React.ReactNode;
}

/**
 * Onglets dynamiques pour les commentaires hiérarchiques premium.
 * Génère un onglet par type de commentaire (ex: DIRECTOR_CONCLUSION, MANAGER_OBSERVATION...)
 */
const HierarchyCommentTabs: React.FC<HierarchyCommentTabsProps> = ({
  contextType,
  contextId,
  availableTypes = [
    'DIRECTOR_CONCLUSION',
    'MANAGER_OBSERVATION',
    'INTERNAL_DISCUSSION'
  ],
  children
}) => {
  const [tab, setTab] = useState(availableTypes[0]);
  const { user } = useAuth();
  const userPermissions = user?.permissions || [];

  // Mapping type → label/icone premium
  const tabMeta = useMemo(() =>
    availableTypes.map(type => ({
      value: type,
      label: hierarchyCommentTypeMeta[type].label,
      icon: hierarchyCommentTypeMeta[type].icon,
    })),
    [availableTypes]
  );

  // Hook pour le type sélectionné
  const {
    comments,
    loading,
    error,
    refresh,
    addComment,
  } = useHierarchyComments({ contextType, contextId, type: tab });

  return (
    <div>
      <PremiumTabs
        tabs={tabMeta}
        value={tab}
        onChange={setTab}
        className="mb-4"
      />
      <div>
        <HierarchyCommentList
          comments={comments}
          loading={loading}
          error={error}
          type={tab}
          refresh={refresh}
        />
        {userPermissions.includes('comment:create') && (
          <div className="mt-6">
            <HierarchyCommentForm
              type={tab}
              loading={loading}
              error={error}
              onSubmit={addComment}
            />
          </div>
        )}
        {!userPermissions.includes('comment:create') && (
          <div className="mt-6 text-slate-400 italic text-center">
            Vous n'avez pas l'autorisation d'ajouter un commentaire hiérarchique.
          </div>
        )}
      </div>
    </div>
  );
};

export default HierarchyCommentTabs;
