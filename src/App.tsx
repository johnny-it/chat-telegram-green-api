import { Chat } from './components/Chat'
import { ConnectionScreen } from './components/ConnectionScreen'
import { useChatSession } from './hooks/useChatSession'

/**
 * Выбирает экран подключения или рабочую область активной сессии.
 * @returns Корневой интерфейс приложения.
 */
function App() {
  const controller = useChatSession()
  const { state } = controller

  if (!state.credentials) {
    return <ConnectionScreen status={state.connectionStatus} error={state.connectionError} onConnect={controller.connect} />
  }

  return <Chat controller={controller} />
}

export default App
