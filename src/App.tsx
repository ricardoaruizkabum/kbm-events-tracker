import { useTrack } from "./hooks/useTrack";

export default function App() {
  const track = useTrack();

  return (
    <div style={{ fontFamily: "sans-serif", padding: 40 }}>
      <h1>Tracker Demo</h1>

      <button
        onClick={() =>
          track({
            app: "demo-app",
            name: "favorite",
            data: { user: "123", product: "pro123" },
          })
        }
      >
        Favorite (Manual Track - Console Adapter)
      </button>

      <br />
      <br />

      <button
        data-event-click
        data-event-name="add_to_cart"
        data-event-object='{"user":"123","product":"pro123","quantity":1}'
        // data-event-object={JSON.stringify({userId:"123",plan:"pro123"})}
      >
        Add To Cart (Auto Track - Console Adapter)
      </button>

      <br />
      <br />

      <button
        data-event-click
        data-event-name="view_details"
        data-event-object='{"userId":"123","plan":"pro123"}'
        // data-event-object={JSON.stringify({userId:"123",plan:"pro123"})}
      >
        View Details (Auto Track - API Adapter)
      </button>

      <div style={{ height: "150vh", display: "flex", alignItems: "flex-end" }}>
        <p style={{ color: "#999" }}>↓ Role para baixo para disparar o evento</p>
      </div>

      <div
        data-event-view
        data-event-name="banner_viewed"
        data-event-object='{"banner":"bottom-banner","user":"123", "offer":"20% off"}'
        style={{
          padding: 32,
          background: "#e0f7fa",
          borderRadius: 8,
          textAlign: "center",
        }}
      >
        🎯 Elemento visível — evento disparado!
      </div>
    </div>
  );
}
