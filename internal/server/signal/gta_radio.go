package signal

import "github.com/TNTcraftHIM/Piik/internal/server/protocol"

func (s *Server) handleGtaRadio(sess *session, viewer *authenticatedSession, station int) {
	if s.gtaRadio == nil || viewer.role != protocol.RoleViewer {
		return
	}
	s.send(sess, protocol.GtaRadioResultMessage{Type: "gta-radio-result", Result: s.selectGtaRadio(sess, viewer, station)})
}

func (s *Server) selectGtaRadio(sess *session, viewer *authenticatedSession, station int) string {
	roomID := viewer.roomID
	viewers := s.store.GetConnectedViewers(roomID)
	share := s.shares[roomID]
	if len(viewers) != 1 || viewers[0].SessionID != sess.sessionID ||
		share.generation == "" || share.pausedGeneration == share.generation {
		return "unavailable"
	}
	if _, ok := s.store.GetConnectedHost(roomID); !ok {
		return "unavailable"
	}
	if _, ok := s.router.resolveActiveViewerMediaEdge(roomID, viewer.peerID); !ok {
		return "unavailable"
	}
	now := s.now()
	if elapsed := now - s.lastGtaRadioAtMs; s.lastGtaRadioAtMs != 0 && elapsed >= 0 && elapsed < 750 {
		return "busy"
	}
	s.lastGtaRadioAtMs = now
	if s.gtaRadio(station) {
		return "sent"
	}
	return "not-driving"
}
