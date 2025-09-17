// IFC property helpers extracted from App.tsx

// Normalizes IFC class from various shapes
export function extractIfcClass(data: any): string | undefined {
  try {
    if (!data) return undefined;
    const pick = (v: any): string | undefined => {
      if (v == null) return undefined;
      if (typeof v === 'string') return v;
      if (typeof v === 'object') {
        if (typeof v.value === 'string') return v.value;
        const key = Object.keys(v || {}).find(k => typeof (v as any)[k] === 'string');
        if (key) return String((v as any)[key]);
      }
      return undefined;
    };
    const candidates = [
      data?.h_category, data?._category, data?.category,
      data?._type, data?.type, data?._entity, data?._class,
      data?.IfcType, data?.ifcType, data?.IFCClass, data?.ifcClass,
      data?.ObjectType, data?.objectType,
    ];
    for (const c of candidates) {
      const val = pick(c);
      if (val) return val;
    }
  } catch {}
  return undefined;
}

// Gets name from typical fields
export function extractName(data: any): string | undefined {
  try {
    if (!data) return undefined;
    const pick = (v: any): string | undefined => {
      if (v == null) return undefined;
      if (typeof v === 'string') return v;
      if (typeof v === 'object' && typeof v.value === 'string') return v.value;
      return undefined;
    };
    const candidates = [
      data?.Name, data?.LongName, data?.name, data?.ObjectName, data?.objectName,
      data?._name, data?.h_name,
    ];
    for (const c of candidates) {
      const val = pick(c);
      if (val) return val;
    }
  } catch {}
  return undefined;
}

// Gets GlobalId from typical fields
export function extractGlobalId(data: any): string | undefined {
  try {
    if (!data) return undefined;
    const pick = (v: any): string | undefined => {
      if (v == null) return undefined;
      if (typeof v === 'string') return v;
      if (typeof v === 'object' && typeof v.value === 'string') return v.value;
      return undefined;
    };
    const candidates = [
      data?.GlobalId, data?.GlobalID, data?.globalId,
      data?._guid, data?.h_guid,
    ];
    for (const c of candidates) {
      const val = pick(c);
      if (val) return val;
    }
  } catch {}
  return undefined;
}
