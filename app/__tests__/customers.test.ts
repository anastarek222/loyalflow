import { Customer, LoyaltyProgram } from '@loyalflow/server';
import { PrismaClient } from '@prisma/client';

declare let prisma: PrismaClient;

const TEST_CUSTOMER_ID = 'test-customer-1';

describe('Customer Management', () => {
 beforeEach(() => {
 prisma = new PrismaClient();
});

test('should create a new customer', async () => {
  
   try {
 const customer = await prisma.customer.create({
 data: {
 id: TEST_CUSTOMER_ID,
 name: 'Test Customer',
 email: 'test@example.com',
 loyaltyProgram: {
 create: {
 name: 'Test Program',
 type: 'VISITS',
 pointsPerVisit: 10,
 },
 },
 });
 expect(customer).toHaveProperty('id', TEST_CUSTOMER_ID);

 expect(customer.loyaltyProgram).toHaveProperty('type', 'VISITS');
 } catch (error) {
 fail(`Failed to create customer: ${String(error)}`);
 };
});

test('should retrieve customer by ID', async () => {
 await prisma.customer.create({
 data: {
 id: 'retrieve-customer-1',
 name: 'Retrieve Customer',
 email: 'retrieve@example.com',
 },
 });

 const customer = await prisma.customer.findUnique({
 where: {
 id: 'retrieve-customer-1',
 },
 });
 expect(customer).toHaveProperty('name', 'Retrieve Customer');
 });

test('should update customer details', async () => {
 const initialCustomer = await prisma.customer.create({
 data: {
 id: 'update-customer-1',
 name: 'Original Name',
 email: 'update@example.com',
 },
 });

 const updatedCustomer = await prisma.customer.update({
 where: {
 id: initialCustomer.id,
 },
 data: {
 name: 'Updated Name',
 },
 });
 expect(updatedCustomer).toHaveProperty('name', 'Updated Name');
 });

test('should delete customer successfully', async () => {
 const customerId = 'delete-customer-1';

 await prisma.customer.create({
 data: {
 id: customerId,
 name: 'Delete Customer',
 email: 'delete@example.com',
 },
});

 const { count } = await prisma.customer.deleteMany({
 where: {
 id: customerId,
 },
});
 expect(count).toBe(1);
 });
});