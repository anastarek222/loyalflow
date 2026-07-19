import { auth } from '@/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

import type { NextApiRequest, NextApiResponse } from 'next';
export const GET = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const session = await getSession({ req })
    if (!session) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const businessId = session.user.businessId
    if (!businessId) {
      return res.status(400).json({ message: 'Business ID not found' })
    }

    // Historical Trends: Visits (CUSTOMER_CREATED activities)
    const customerCreated = await prisma.businessActivity.findMany({
      where: {
        businessId,
        type: 'CUSTOMER_CREATED'
      },
      select: {
        createdAt: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    // Historical Trends: Points (EARN transactions)
    const pointsEarned = await prisma.loyaltyTransaction.aggregate({
      where: {
        businessId,
        type: 'EARN'
      },
      _sum: {
        amount: true
      }
    })

    // Return mock data for now
    res.json({
      historicalTrends: {
        visits: customerCreated,
        points: pointsEarned
      }
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Internal Server Error' })
  }
}
