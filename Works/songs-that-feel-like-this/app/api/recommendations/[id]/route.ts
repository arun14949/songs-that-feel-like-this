import { NextRequest, NextResponse } from 'next/server';
import { getRecommendation } from '@/lib/storage';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const recommendation = await getRecommendation(id);

    if (!recommendation) {
      return NextResponse.json(
        { error: 'Recommendation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ recommendation });
  } catch (error) {
    console.error('Error fetching recommendation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recommendation' },
      { status: 500 }
    );
  }
}
