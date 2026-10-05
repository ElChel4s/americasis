import { NextResponse } from 'next/server';

export const successResponse = (data, message = 'Success', status = 200) => {
  return NextResponse.json({ success: true, message, data }, { status });
};

export const errorResponse = (message = 'Error', status = 500, errors = null) => {
  return NextResponse.json({ success: false, message, errors }, { status });
};
