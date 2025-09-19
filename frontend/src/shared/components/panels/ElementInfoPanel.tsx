import React from 'react';

interface ElementInfoPanelProps {
  selectedElement: any;
  localId: number | null;
  isMobile: boolean;
  selectedSensor?: any;
}

const ElementInfoPanel: React.FC<ElementInfoPanelProps> = ({
  selectedElement,
  localId,
  isMobile,
  selectedSensor,
}) => {
  return (
    <div style={{
      flex: 1,
      padding: '20px',
      overflowY: 'auto'
    }}>
      <h3 style={{ margin: '0 0 8px 0', fontSize: isMobile ? '15px' : '16px', color: '#333' }}>
        Informació de l'Element
      </h3>
      <p style={{ 
        margin: '0 0 16px 0', 
        fontSize: '14px', 
        color: '#666',
        lineHeight: '1.4'
      }}>
        Feu clic en un element del model per veure la seva informació aquí. Es mostrarà el Nom, Tipus, ExpressID i els seus Property Sets.
      </p>
      
      {selectedElement ? (
        <div style={{
          background: '#f8f9fa',
          padding: '16px',
          borderRadius: '4px',
          border: '1px solid #e0e6ef'
        }}>
          <div style={{ marginBottom: '12px' }}>
            {/* Títol: Nom del dispositiu si existeix; si no, el codi d'espai */}
            <h4 style={{ margin: '0 0 6px 0', fontSize: isMobile ? '15px' : '16px', color: '#333' }}>
              {selectedSensor?.dispositiu || selectedElement.Name?.value || 'Element sense nom'}
            </h4>
            {/* Subtítol 1: Codi d'espai (ALB-P02-047) */}
            {selectedElement?.Name?.value && (
              <div style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#555' }}>
                {selectedElement.Name.value}
              </div>
            )}
            {/* Subtítol 2: Departament */}
            {selectedSensor?.departament && (
              <div style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#777' }}>
                {selectedSensor.departament}
              </div>
            )}
            <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#666' }}>
              Tipus: {selectedElement.Type?.value || 'Desconegut'}
            </p>
            <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#666' }}>
              ExpressID: {localId}
            </p>
          </div>
          
          <div style={{ marginBottom: '12px' }}>
            <h5 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#333' }}>
              Atributs principals:
            </h5>
            <div style={{ fontSize: '12px', color: '#666' }}>
              {Object.entries(selectedElement)
                .filter(([key, value]) => 
                  key !== 'Name' && 
                  key !== 'Type' && 
                  value && 
                  typeof value === 'object' && 
                  'value' in value
                )
                .slice(0, 5) // Mostrar solo los primeros 5 atributos
                .map(([key, value]: [string, any]) => (
                  <div key={key} style={{ marginBottom: '4px' }}>
                    <strong>{key}:</strong> {String(value.value)}
                  </div>
                ))}
            </div>
          </div>
          
          <div style={{ fontSize: '11px', color: '#999', fontStyle: 'italic' }}>
            Feu clic en un altre element per veure la seva informació
          </div>
        </div>
      ) : (
        <div style={{
          background: '#f8f9fa',
          padding: '16px',
          borderRadius: '4px',
          border: '1px solid #e0e6ef',
          textAlign: 'center',
          color: '#666',
          fontSize: '14px'
        }}>
          Cap element seleccionat
        </div>
      )}
    </div>
  );
};

export default ElementInfoPanel;
