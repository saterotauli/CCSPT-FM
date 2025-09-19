import React from 'react';
import AppLayout from '@shared/components/layout/AppLayout';
import FMAssetPanel from '@features/fm/components/FMAssetPanel';
import FMSpacePanel from '@features/fm/components/FMSpacePanel';
import FMOverviewViewer from '@features/fm/components/FMOverviewViewer';
import '@features/fm/FMPage.css';

interface FMProps {
  isMobile: boolean;
}

const FM: React.FC<FMProps> = ({ isMobile }) => {
  return (
    <div className="fm-page">
      <AppLayout
        isMobile={isMobile}
        leftPanel={<FMAssetPanel />}
        centerContent={<FMOverviewViewer />}
        rightPanel={<FMSpacePanel />}
        className="fm-layout"
      />
    </div>
  );
};

export default FM;
