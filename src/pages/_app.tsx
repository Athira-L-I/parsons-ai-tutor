import '@/styles/globals.css';
import '@/styles/parsons.css';
import type { AppProps } from 'next/app';
import { ParsonsProvider } from '@/contexts/ParsonsContext';
import Layout from '@/components/Layout';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ParsonsProvider problemId="global">
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </ParsonsProvider>
  );
}