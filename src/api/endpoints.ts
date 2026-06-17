export const API_ENDPOINTS = {
  dashboard: {
    summary: "/dashboard/summary",
    collaboration: "/dashboard/collaboration",
    researchProjects: "/dashboard/research-projects",
  },
  kst: {
    cangar: {
      summary: "/api/kst/cangar/data/summary",
      booking: "/api/kst/cangar/data/booking",
      stock: "/api/kst/cangar/data/stok",
      stockItems: "/api/kst/cangar/data/stok/items",
      finance: "/api/kst/cangar/data/keuangan",
      financeRecap: "/api/kst/cangar/data/keuangan/rekap",
    },
    jatikerto: {
      pertanianItems: "/kst/jatikerto/data/pertanian/items",
      peternakanItems: "/kst/jatikerto/data/peternakan/items",
      kemitraanItems: "/kst/jatikerto/data/kemitraan/items",
      akademikItems: "/kst/jatikerto/data/akademik/items",
      konservasiHewan: "/kst/jatikerto/data/konservasi/hewan",
      konservasiTanaman: "/kst/jatikerto/data/konservasi/tanaman",
    },
    ngijo: {
      health: "/kst/ngijo/health",
      contract: "/kst/ngijo/contract",
      activeProjects: "/kst/ngijo/data/tracker-inovasi/projek-aktif",
      averageTrl: "/kst/ngijo/data/tracker-inovasi/avg-trl",
      pendingPatents: "/kst/ngijo/data/tracker-inovasi/paten-tertunda",
      collaboration: "/kst/ngijo/data/tracker-inovasi/kolaborasi",
      renewableEnergy: "/kst/ngijo/data/keberlanjutan/energi-terbarukan",
      greenPerformance: "/kst/ngijo/data/keberlanjutan/green-performance",
      recycledWater: "/kst/ngijo/data/keberlanjutan/air-daur-ulang",
      wasteMetric: "/kst/ngijo/data/keberlanjutan/metrik-limbah",
      energyDynamics: "/kst/ngijo/data/keberlanjutan/dinamika-energi",
      sensorFeed: "/kst/ngijo/data/keberlanjutan/sensor-feed",
      activeResearch: "/kst/ngijo/data/penelitian",
    },
  },
  reports: {
    download: "/reports/download",
  },
} as const;
