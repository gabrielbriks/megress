import { Plus } from 'lucide-react';
import letStart from './assets/lets-start-ilustration.svg';
import logo from './assets/logo.svg';
export function App() {
  return (
    <div className="h-screen flex flex-col items-center justify-center gap-8">
      <img src={logo} alt="me.gress logo" />
      <img src={letStart} alt="me.gress" />

      <p className="text-zinc-300 leading-relaxed max-w-80 text-center">
        Você ainda não cadastrou nenhuma meta, que tal{' '}
        <a href="#c" className="underline">
          cadastrar um
        </a>{' '}
        agora mesmo?
      </p>

      <button
        type="button"
        className="px-4 py-2.5 rounded-lg bg-violet-500 text-violet-50 flex items-center gap-2 font-medium text-sm hover:bg-violet-600"
      >
        <Plus className="size-4" />
        Cadastrar meta
      </button>
    </div>
  );
}

export default App;
