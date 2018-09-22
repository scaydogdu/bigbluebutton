package org.bigbluebutton.core.apps.users

import org.bigbluebutton.common2.msgs.UserLeaveReqMsg
import org.bigbluebutton.common2.msgs._
import org.bigbluebutton.core.apps.presentationpod.PresentationPodsApp
import org.bigbluebutton.core.domain.MeetingState2x
import org.bigbluebutton.core.models.Users2x
import org.bigbluebutton.core.running.{ MeetingActor, OutMsgRouter }
import org.bigbluebutton.core.util.TimeUtil
import org.bigbluebutton.core2.MeetingStatus2x
import org.bigbluebutton.core2.message.senders.MsgBuilder

trait UserLeaveReqMsgHdlr {
  this: MeetingActor =>

  val outGW: OutMsgRouter

  def handleUserLeaveReqMsg(msg: UserLeaveReqMsg, state: MeetingState2x): MeetingState2x = {

    def broadcastSetPresenterInPodRespMsg(podId: String, nextPresenterId: String, requesterId: String): Unit = {
      val routing = Routing.addMsgToClientRouting(
        MessageTypes.BROADCAST_TO_MEETING,
        liveMeeting.props.meetingProp.intId, requesterId)
      val envelope = BbbCoreEnvelope(SetPresenterInPodRespMsg.NAME, routing)
      val header = BbbClientMsgHeader(SetPresenterInPodRespMsg.NAME, liveMeeting.props.meetingProp.intId, requesterId)

      val body = SetPresenterInPodRespMsgBody(podId, nextPresenterId)
      val event = SetPresenterInPodRespMsg(header, body)
      val msgEvent = BbbCommonEnvCoreMsg(envelope, event)
      outGW.send(msgEvent)
    }

    var newState = state
    for {
      u <- Users2x.remove(liveMeeting.users2x, msg.body.userId)
    } yield {
      log.info("User left meeting. meetingId=" + props.meetingProp.intId + " userId=" + u.intId + " user=" + u)

      val authedUsers = Users2x.findAllAuthedUsers(liveMeeting.users2x)
      if (u.authed && authedUsers.isEmpty) {
        MeetingStatus2x.setLastAuthedUserLeftOn(liveMeeting.status)
      }

      captionApp2x.handleUserLeavingMsg(msg.body.userId, liveMeeting, msgBus)
      stopRecordingIfAutoStart2x(outGW, liveMeeting, state)

      // send a user left event for the clients to update
      val userLeftMeetingEvent = MsgBuilder.buildUserLeftMeetingEvtMsg(liveMeeting.props.meetingProp.intId, u.intId)
      outGW.send(userLeftMeetingEvent)

      if (u.presenter) {
        UsersApp.automaticallyAssignPresenter(outGW, liveMeeting)

        // request screenshare to end
        screenshareApp2x.handleScreenshareStoppedVoiceConfEvtMsg(
          liveMeeting.props.voiceProp.voiceConf,
          liveMeeting.props.screenshareProps.screenshareConf,
          liveMeeting, msgBus)

        // request ongoing poll to end
        pollApp.stopPoll(state, u.intId, liveMeeting, msgBus)
      }

      if (Users2x.userIsInPresenterGroup(liveMeeting.users2x, u.intId)) {
        Users2x.removeUserFromPresenterGroup(liveMeeting.users2x, u.intId)
        outGW.send(buildRemoveUserFromPresenterGroup(liveMeeting.props.meetingProp.intId, u.intId, u.intId))

        val pods = PresentationPodsApp.findPodsWhereUserIsPresenter(state.presentationPodManager, u.intId)
        if (pods.length > 0) {
          val presenters = Users2x.getPresenterGroupUsers(liveMeeting.users2x)
          var newPresenter = ""
          if (presenters.length > 0) {
            newPresenter = presenters.head
          }

          pods foreach { pod =>
            val updatedPod = pod.setCurrentPresenter(newPresenter)
            broadcastSetPresenterInPodRespMsg(pod.id, newPresenter, "system")
            val newpods = state.presentationPodManager.addPod(updatedPod)
            newState = state.update(newpods)
          }
        }
      }
    }

    if (liveMeeting.props.meetingProp.isBreakout) {
      updateParentMeetingWithUsers()
    }

    if (Users2x.numUsers(liveMeeting.users2x) == 0) {
      val tracker = state.expiryTracker.setLastUserLeftOn(TimeUtil.timeNowInMs())
      newState.update(tracker)
    } else {
      newState
    }
  }

}
