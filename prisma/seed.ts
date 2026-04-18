import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const adminHash = await bcrypt.hash('admin123', 10)
  const staffHash = await bcrypt.hash('staff123', 10)

  const admin = await prisma.user.upsert({
    where:  { email: 'admin@company.com' },
    update: {},
    create: { email: 'admin@company.com', name: 'Admin User', passwordHash: adminHash, role: 'ADMIN' },
  })

  const staff = await prisma.user.upsert({
    where:  { email: 'staff@company.com' },
    update: {},
    create: { email: 'staff@company.com', name: 'Staff User', passwordHash: staffHash, role: 'STAFF' },
  })

  await prisma.asset.upsert({
    where:  { assetTag: 'LT-001' },
    update: {},
    create: {
      assetTag:       'LT-001',
      type:           'Laptop',
      brand:          'Dell',
      model:          'Latitude 5540',
      serialNumber:   'DL20240001',
      status:         'ASSIGNED',
      assignedUserId: staff.id,
      warrantyExpiry: new Date('2026-12-31'),
      notes:          'Assigned to onboarding staff.',
    },
  })

  await prisma.asset.upsert({
    where:  { assetTag: 'MN-001' },
    update: {},
    create: {
      assetTag:       'MN-001',
      type:           'Monitor',
      brand:          'LG',
      model:          '27UK850-W',
      serialNumber:   'LG20240042',
      status:         'IN_STOCK',
      warrantyExpiry: new Date('2027-06-30'),
      notes:          null,
    },
  })

  await prisma.asset.upsert({
    where:  { assetTag: 'LT-002' },
    update: {},
    create: {
      assetTag:     'LT-002',
      type:         'Laptop',
      brand:        'Lenovo',
      model:        'ThinkPad X1 Carbon',
      serialNumber: 'LN20240015',
      status:       'IN_REPAIR',
      notes:        'Screen cracked. Sent to repair vendor.',
    },
  })

  await prisma.asset.upsert({
    where:  { assetTag: 'KB-001' },
    update: {},
    create: {
      assetTag: 'KB-001',
      type:     'Keyboard',
      brand:    'Logitech',
      model:    'MX Keys',
      status:   'IN_STOCK',
    },
  })

  await prisma.auditLog.create({
    data: {
      userId:     admin.id,
      action:     'SEED',
      entityType: 'system',
      detail:     'Database seeded with demo data',
    },
  })

  console.log('Seed complete.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
