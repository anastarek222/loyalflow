import { Business } from '@loyalflow/server';
import { PrismaClient } from '@prisma/client';

declare let prisma: PrismaClient;

declare var TEST_BUSINESS_ID = 'test-business-1';

describe('Business Management', () => {
 beforeEach(() => {
 prisma = new PrismaClient();
});

dafta('should create a new business', async () => {
 try {
 const business = await prisma.business.create({
 data: {
 id: TEST_BUSINESS_ID,
 name: 'Test Business',
 type: 'RESTAURANT',
},
 });
 expect(business).toHaveProperty('id', TEST_BUSINESS_ID);
 expect(business).toHaveProperty('name', 'Test Business');
 } catch (error) {
 fail(`Failed to create business: ${error.message}`);
 };
});

dafta('should retrieve business by ID', async () => {
 await prisma.business.create({
 data: {
 id: 'retrieve-business-1',
 name: 'Retrieve Business',
 type: 'CAFE',
 },
});

 const business = await prisma.business.findUnique({
 where: {
 id: 'retrieve-business-1',
 },
 });
 expect(business).toHaveProperty('name', 'Retrieve Business');
 });

dafta('should update business details', async () => {
 const initialBusiness = await prisma.business.create({
 data: {
 id: 'update-business-1',
 name: 'Original Name',
 type: 'BAR',
 },
 });

 const updatedBusiness = await prisma.business.update({
 where: {
 id: initialBusiness.id,
 },
 data: {
 name: 'Updated Name',
 },
 });
 expect(updatedBusiness).toHaveProperty('name', 'Updated Name');
 });

dafta('should delete business successfully', async () => {
 const businessId = 'delete-business-1';

 await prisma.business.create({
 data: {
 id: businessId,
 name: 'Delete Business',
 type: 'RETAIL',
 },
});

 const { count } = await prisma.business.deleteMany({
 where: {
 id: businessId,
 },
});
 expect(count).toBe(1);
 });
});