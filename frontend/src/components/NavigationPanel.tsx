import React from 'react';

interface NavigationPanelProps {
  levels: string[];
  selectedLevel: string | null;
  selectedDepartment: string | null;
  departments: {[key: string]: any[]};
  expandedLevel: string | null;
  showOnlyAlerts: boolean;
  isMobile: boolean;
  alerts: any[];
  onLevelSelect: (level: string) => void;
  onDepartmentSelect: (level: string, department: string) => void;
  onLevelExpand: (level: string, event: React.MouseEvent) => void;
  onShowAll: () => void;
  onShowOnlyAlertsChange: (show: boolean) => void;
}

const NavigationPanel: React.FC<NavigationPanelProps> = ({
  levels,
  selectedLevel,
  selectedDepartment,
  departments,
  expandedLevel,
  showOnlyAlerts,
  isMobile,
  alerts,
  onLevelSelect,
  onDepartmentSelect,
  onLevelExpand,
  onShowAll,
  onShowOnlyAlertsChange,
}) => {
  // Calculate alert counts by level and severity
  const getAlertCountsByLevel = (level: string) => {
    const levelAlerts = alerts.filter(alert => alert.planta === level);
    const mitjaCount = levelAlerts.filter(alert => alert.severity === 'mitjà').length;
    const altCount = levelAlerts.filter(alert => alert.severity === 'alt').length;
    return { mitja: mitjaCount, alt: altCount, total: levelAlerts.length };
  };
  return (
    <div style={{
      width: isMobile ? '100%' : '300px',
      minWidth: isMobile ? 'auto' : '300px',
      flexShrink: isMobile ? 1 : 0,
      height: isMobile ? '200px' : '100%',
      background: '#fff',
      borderRight: isMobile ? 'none' : '1px solid #e0e6ef',
      borderBottom: isMobile ? '1px solid #e0e6ef' : 'none',
      padding: '20px',
      overflowY: 'auto',
      order: isMobile ? 2 : 1
    }}>
      <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#333' }}>
        Nivells i Departaments
      </h3>
      <p style={{ 
        margin: '0 0 16px 0', 
        fontSize: '14px', 
        color: '#666',
        lineHeight: '1.4'
      }}>
        Navega per plantes i departaments
      </p>
      <button onClick={onShowAll} style={{
        background: '#4179b5',
        color: 'white',
        border: 'none',
        padding: '8px 16px',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '14px',
        marginBottom: '16px'
      }}>
        Mostrar tot
      </button>
      
      {/* Checkbox Solo alertas */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: '20px',
        padding: '8px 12px',
        background: '#f8f9fa',
        borderRadius: '4px',
        border: '1px solid #e0e6ef'
      }}>
        <input
          type="checkbox"
          id="showOnlyAlerts"
          checked={showOnlyAlerts}
          onChange={(e) => onShowOnlyAlertsChange(e.target.checked)}
          style={{
            marginRight: '8px',
            cursor: 'pointer'
          }}
        />
        <label 
          htmlFor="showOnlyAlerts"
          style={{
            fontSize: '14px',
            color: '#333',
            cursor: 'pointer',
            userSelect: 'none'
          }}
        >
          Només alertes
        </label>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {levels.map((level, index) => {
          const isExpanded = expandedLevel === level;
          const levelDepartments = departments[level] || [];
          const alertCounts = getAlertCountsByLevel(level);
          
          return (
            <div key={index}>
              {/* Level Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                padding: '8px 12px',
                background: selectedLevel === level ? '#e3f2fd' : '#f8f9fa',
                borderRadius: '4px',
                border: selectedLevel === level ? '1px solid #4179b5' : '1px solid #e0e6ef',
                transition: 'all 0.2s'
              }}>
                {/* Expand/Collapse Button */}
                <button
                  onClick={(e) => onLevelExpand(level, e)}
                  style={{
                    background: 'none',
                    border: 'none',
                    marginRight: '8px',
                    fontSize: '16px',
                    cursor: 'pointer',
                    padding: '2px',
                    borderRadius: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '20px',
                    height: '20px'
                  }}
                >
                  {isExpanded ? '−' : '+'}
                </button>
                
                {/* Level Name - Clickable */}
                <div
                  onClick={() => onLevelSelect(level)}
                  style={{
                    flex: 1,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <span style={{ 
                    fontSize: '14px', 
                    color: selectedLevel === level ? '#4179b5' : '#333',
                    fontWeight: selectedLevel === level ? 'bold' : 'normal'
                  }}>
                    {level}
                  </span>
                  {selectedDepartment && selectedLevel === level && (
                    <span style={{ 
                      marginLeft: '8px', 
                      fontSize: '12px', 
                      color: '#666',
                      fontStyle: 'italic'
                    }}>
                      - {selectedDepartment}
                    </span>
                  )}
                </div>
                
                {/* Alert Counts */}
                {alertCounts.total > 0 && (
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    {alertCounts.alt > 0 && (
                      <span style={{ 
                        fontSize: '11px', 
                        color: 'white',
                        background: '#ff7873',
                        padding: '2px 6px',
                        borderRadius: '10px',
                        fontWeight: 'bold'
                      }}>
                        {alertCounts.alt} alt
                      </span>
                    )}
                    {alertCounts.mitja > 0 && (
                      <span style={{ 
                        fontSize: '11px', 
                        color: 'white',
                        background: '#ffd073',
                        padding: '2px 6px',
                        borderRadius: '10px',
                        fontWeight: 'bold'
                      }}>
                        {alertCounts.mitja} mitjà
                      </span>
                    )}
                  </div>
                )}
              </div>
              
              {/* Departments List */}
              {isExpanded && levelDepartments.length > 0 && (
                <div style={{ 
                  marginLeft: '20px', 
                  marginTop: '4px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px'
                }}>
                  {levelDepartments.map((dept, deptIndex) => {
                    const isSelected = selectedLevel === level && selectedDepartment === dept.departament;
                    return (
                      <div 
                        key={deptIndex}
                        onClick={() => onDepartmentSelect(level, dept.departament)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '6px 12px',
                          background: isSelected ? '#e8f5e8' : '#fff',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          border: isSelected ? '1px solid #4caf50' : '1px solid #e0e6ef',
                          fontSize: '13px',
                          transition: 'all 0.2s'
                        }}
                      >
                        <span style={{ 
                          marginRight: '8px', 
                          fontSize: '12px', 
                          color: isSelected ? '#4caf50' : '#666' 
                        }}>
                          {isSelected ? '✓' : '📁'}
                        </span>
                        <span style={{ 
                          color: isSelected ? '#2e7d32' : '#333',
                          flex: 1,
                          fontWeight: isSelected ? 'bold' : 'normal'
                        }}>
                          {dept.departament}
                        </span>
                        <span style={{ 
                          fontSize: '11px', 
                          color: '#666',
                          background: isSelected ? '#e8f5e8' : '#f0f0f0',
                          padding: '1px 4px',
                          borderRadius: '8px'
                        }}>
                          {dept.count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default NavigationPanel;
