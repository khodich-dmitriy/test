import { NextResponse } from 'next/server';

export function unauthorizedResponse() {
  return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
}

export function notFoundResponse() {
  return NextResponse.json({ message: 'Withdrawal not found' }, { status: 404 });
}
