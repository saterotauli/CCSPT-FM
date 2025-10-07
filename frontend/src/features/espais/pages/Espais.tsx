import React from 'react';
import { Layout } from '@shared/components/layout';
import { EspaisPanel, EspaisViewer } from '@features/espais/components';

interface EspaisProps {
  isMobile?: boolean;
}

const Espais: React.FC<EspaisProps> = ({ isMobile = false }) => {
  return (
    <div className="fm-page">
      <Layout
        isMobile={isMobile}
        leftPanel={<EspaisPanel />}
        centerContent={<EspaisViewer isMobile={isMobile} />}
        className="fm-layout"
      />
    </div>
  );
};

export default Espais;
