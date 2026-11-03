import { PrismaClient, AmbulanceStatus, EmergencyType, EmergencyPriority } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ---- Admin ----
  const existingAdmin = await prisma.admin.findUnique({ where: { email: 'admin@dispatch.local' } });
  if (!existingAdmin) {
    const hash = await bcrypt.hash('Admin@1234', 12);
    await prisma.admin.create({
      data: {
        name: 'Super Admin',
        email: 'admin@dispatch.local',
        passwordHash: hash,
        role: 'SUPER_ADMIN',
      },
    });
    console.log('✅ Admin created: admin@dispatch.local / Admin@1234');
  }

  // ---- Ambulances (Dwarka / West Delhi area) ----
  const ambulances = [
    { name: 'AMB-DW-01', vehicleNumber: 'DL-01-AA-0001', latitude: 28.5921, longitude: 77.0460, status: 'AVAILABLE' as AmbulanceStatus },
    { name: 'AMB-DW-02', vehicleNumber: 'DL-01-AA-0002', latitude: 28.6013, longitude: 77.0690, status: 'AVAILABLE' as AmbulanceStatus },
    { name: 'AMB-JK-01', vehicleNumber: 'DL-01-AA-0003', latitude: 28.6282, longitude: 77.0862, status: 'AVAILABLE' as AmbulanceStatus },
    { name: 'AMB-UN-01', vehicleNumber: 'DL-01-AA-0004', latitude: 28.6200, longitude: 77.0580, status: 'AVAILABLE' as AmbulanceStatus },
    { name: 'AMB-PL-01', vehicleNumber: 'DL-01-AA-0005', latitude: 28.5700, longitude: 77.0800, status: 'AVAILABLE' as AmbulanceStatus },
    { name: 'AMB-VK-01', vehicleNumber: 'DL-01-AA-0006', latitude: 28.6450, longitude: 77.0720, status: 'AVAILABLE' as AmbulanceStatus },
    { name: 'AMB-DW-03', vehicleNumber: 'DL-01-AA-0007', latitude: 28.5850, longitude: 77.0550, status: 'AVAILABLE' as AmbulanceStatus },
    { name: 'AMB-TK-01', vehicleNumber: 'DL-01-AA-0008', latitude: 28.6100, longitude: 77.0350, status: 'OFFLINE' as AmbulanceStatus },
  ];

  for (const amb of ambulances) {
    const exists = await prisma.ambulance.findUnique({ where: { vehicleNumber: amb.vehicleNumber } });
    if (!exists) {
      await prisma.ambulance.create({ data: amb });
    }
  }
  console.log('✅ Ambulances seeded');

  // ---- Predefined Patient Dataset (Delhi - Dwarka, Janakpuri, Uttam Nagar, Palam, Vikaspuri) ----
  const patients: Array<{
    name: string;
    phoneNumber: string;
    locationName: string;
    latitude: number;
    longitude: number;
    emergencyType: EmergencyType;
    emergencyPriority: EmergencyPriority;
  }> = [
    {
      name: 'Rajesh Kumar',
      phoneNumber: '9810001001',
      locationName: 'Dwarka Sector 6 Metro Station',
      latitude: 28.5921,
      longitude: 77.0460,
      emergencyType: 'CARDIAC_ARREST',
      emergencyPriority: 'CRITICAL',
    },
    {
      name: 'Priya Sharma',
      phoneNumber: '9810001002',
      locationName: 'Janakpuri District Centre',
      latitude: 28.6282,
      longitude: 77.0862,
      emergencyType: 'ACCIDENT',
      emergencyPriority: 'HIGH',
    },
    {
      name: 'Amit Singh',
      phoneNumber: '9810001003',
      locationName: 'Uttam Nagar East Metro',
      latitude: 28.6208,
      longitude: 77.0573,
      emergencyType: 'STROKE',
      emergencyPriority: 'CRITICAL',
    },
    {
      name: 'Sunita Verma',
      phoneNumber: '9810001004',
      locationName: 'Palam Village Road',
      latitude: 28.5897,
      longitude: 77.0793,
      emergencyType: 'MATERNITY',
      emergencyPriority: 'HIGH',
    },
    {
      name: 'Vikas Gupta',
      phoneNumber: '9810001005',
      locationName: 'Vikaspuri Main Market',
      latitude: 28.6450,
      longitude: 77.0713,
      emergencyType: 'RESPIRATORY',
      emergencyPriority: 'HIGH',
    },
    {
      name: 'Meena Joshi',
      phoneNumber: '9810001006',
      locationName: 'Dwarka Sector 10',
      latitude: 28.5805,
      longitude: 77.0590,
      emergencyType: 'BURNS',
      emergencyPriority: 'HIGH',
    },
    {
      name: 'Ramesh Yadav',
      phoneNumber: '9810001007',
      locationName: 'Dwarka Sector 14',
      latitude: 28.5753,
      longitude: 77.0460,
      emergencyType: 'TRAUMA',
      emergencyPriority: 'CRITICAL',
    },
    {
      name: 'Kavita Nair',
      phoneNumber: '9810001008',
      locationName: 'Janakpuri C Block',
      latitude: 28.6330,
      longitude: 77.0820,
      emergencyType: 'POISONING',
      emergencyPriority: 'HIGH',
    },
    {
      name: 'Suresh Patel',
      phoneNumber: '9810001009',
      locationName: 'Uttam Nagar West',
      latitude: 28.6190,
      longitude: 77.0490,
      emergencyType: 'ACCIDENT',
      emergencyPriority: 'CRITICAL',
    },
    {
      name: 'Anita Malhotra',
      phoneNumber: '9810001010',
      locationName: 'Palam Dabri Road',
      latitude: 28.5810,
      longitude: 77.0710,
      emergencyType: 'CARDIAC_ARREST',
      emergencyPriority: 'CRITICAL',
    },
    {
      name: 'Deepak Chauhan',
      phoneNumber: '9810001011',
      locationName: 'Vikaspuri Sector C',
      latitude: 28.6395,
      longitude: 77.0650,
      emergencyType: 'STROKE',
      emergencyPriority: 'HIGH',
    },
    {
      name: 'Rekha Tiwari',
      phoneNumber: '9810001012',
      locationName: 'Dwarka Sector 18',
      latitude: 28.5645,
      longitude: 77.0523,
      emergencyType: 'RESPIRATORY',
      emergencyPriority: 'MEDIUM',
    },
    {
      name: 'Mahesh Agarwal',
      phoneNumber: '9810001013',
      locationName: 'Janakpuri A-1 Block',
      latitude: 28.6250,
      longitude: 77.0895,
      emergencyType: 'TRAUMA',
      emergencyPriority: 'HIGH',
    },
    {
      name: 'Pooja Kapoor',
      phoneNumber: '9810001014',
      locationName: 'Bindapur Road',
      latitude: 28.6120,
      longitude: 77.0620,
      emergencyType: 'OTHER',
      emergencyPriority: 'LOW',
    },
    {
      name: 'Sanjay Mishra',
      phoneNumber: '9810001015',
      locationName: 'Nawada Metro Station',
      latitude: 28.6070,
      longitude: 77.0780,
      emergencyType: 'ACCIDENT',
      emergencyPriority: 'HIGH',
    },
    {
      name: 'Neha Bhatia',
      phoneNumber: '9810001016',
      locationName: 'Dwarka Sector 21',
      latitude: 28.5540,
      longitude: 77.0580,
      emergencyType: 'MATERNITY',
      emergencyPriority: 'CRITICAL',
    },
    {
      name: 'Ravi Pillai',
      phoneNumber: '9810001017',
      locationName: 'Tilak Nagar',
      latitude: 28.6410,
      longitude: 77.0990,
      emergencyType: 'CARDIAC_ARREST',
      emergencyPriority: 'CRITICAL',
    },
    {
      name: 'Seema Rawat',
      phoneNumber: '9810001018',
      locationName: 'Subhash Nagar',
      latitude: 28.6480,
      longitude: 77.1040,
      emergencyType: 'BURNS',
      emergencyPriority: 'MEDIUM',
    },
  ];

  for (const p of patients) {
    const exists = await prisma.patient.findFirst({ where: { phoneNumber: p.phoneNumber } });
    if (!exists) {
      await prisma.patient.create({ data: p });
    }
  }
  console.log(`✅ ${patients.length} patients seeded`);

  console.log('🎉 Seeding complete!');
  console.log('');
  console.log('Login credentials:');
  console.log('  Email: admin@dispatch.local');
  console.log('  Password: Admin@1234');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
