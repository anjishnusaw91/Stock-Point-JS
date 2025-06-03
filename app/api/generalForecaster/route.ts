import { NextResponse } from 'next/server';
import { spawn } from 'child_process';

export async function POST(req: Request) {
  try {
    const { symbol, days = 4 } = await req.json();

    if (!symbol) {
      return NextResponse.json(
        { success: false, error: 'Symbol is required' },
        { status: 400 }
      );
    }

    // Prepare the Python command
    const pyProcess = spawn('python', [
      'app/api/generalForecaster/predict.py',
      '--symbol', symbol,
      '--days', days.toString(),
    ]);

    let stdout = '';
    let stderr = '';

    pyProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    pyProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    // Wait for the process to finish
    const exitCode: number = await new Promise((resolve) => {
      pyProcess.on('close', resolve);
    });

    if (exitCode !== 0) {
      console.error('Python script error:', stderr);
      return NextResponse.json(
        { success: false, error: 'LSTM model error: ' + stderr },
        { status: 500 }
      );
    }

    // Parse the JSON output from Python
    let result;
    try {
      result = JSON.parse(stdout);
    } catch (err) {
      console.error('Failed to parse Python output:', stdout);
      return NextResponse.json(
        { success: false, error: 'Failed to parse LSTM model output.' },
        { status: 500 }
      );
    }

    // Return the result as-is (frontend expects this format)
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in forecast generation:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate forecast',
      },
      { status: 500 }
    );
  }
} 