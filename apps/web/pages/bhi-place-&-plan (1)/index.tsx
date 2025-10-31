// Integrated Next.js page for bhi-place-&-plan
// This file exports the main component for Next.js routing

import React from 'react';

import { type Project as _Project } from '../../modules/place-and-plan/types';

import App from './App';

// Note: PDF.js setup moved to _app.tsx or removed entirely
// as it's not needed for the Next.js integration

const BhiPlaceAndPlanPage: React.FC = () => {
  return <App />;
};

export default BhiPlaceAndPlanPage;
