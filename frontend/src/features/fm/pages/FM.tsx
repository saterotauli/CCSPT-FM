import React from 'react';
import { Layout } from '@shared/components/layout';
import { FMAssetPanel, FMOverviewViewer } from '@features/fm/components';
import '@features/fm/FMPage.css';

interface FMProps {
  isMobile: boolean;
}

const FM: React.FC<FMProps> = ({ isMobile }) => {
  return (
    <div className="fm-page">
      <Layout
        isMobile={isMobile}
        leftPanel={<FMAssetPanel />}
        centerContent={<FMOverviewViewer />}
        className="fm-layout"
      />
    </div>
  );
};

export default FM;
