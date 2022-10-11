const { cloudsearch } = require('NeteaseCloudMusicApi')
const { checkLiveStatus, connecting, sendDanmu } = require('./dannmuku')
const { readFile, writeWholeFile } = require('./localFileDatabase')

const databaseName = 'orderSong.miko'

function getOrderSongName(msg) {
  if (!/^点歌/.test(msg)) return false
  const songName = (msg.split('点歌')[1] || '').trim()
  return songName || false
}

function cancelSong({ msg, shortName, uid }) {
  const currOrderList = readFile(databaseName)

  if (/^取消点歌$/.test(msg)) {
    const reverseOrderSongIndex = [...currOrderList]
      .reverse()
      .findIndex(({ uid: listUid }) => uid === listUid)
    if (reverseOrderSongIndex === -1) {
      sendDanmu(`@${shortName} 还没有点歌哦`)
    } else {
      const targetIndex = currOrderList.length - reverseOrderSongIndex - 1
      writeWholeFile(
        databaseName,
        JSON.stringify(
          currOrderList
            .slice(0, targetIndex)
            .concat(currOrderList.slice(targetIndex + 1))
        )
      )
      sendDanmu(`@${shortName} 已取消最新一首点歌`)
    }

    return true
  } else if (/^取消所有$/.test(msg)) {
    sendDanmu(`@${shortName} 已取消所有点歌`)
    writeWholeFile(
      databaseName,
      JSON.stringify(
        currOrderList.filter(({ uid: listUid }) => uid !== listUid)
      )
    )
    return true
  }
  return false
}

async function orderSong(orderInfo) {
  const { shortName, level, uid, userName, brandName, orderSongName } =
    orderInfo

  const { body } = await cloudsearch({
    keywords: orderSongName,
    type: 1,
  })
  if (body.code !== 200) {
    sendDanmu(`@${shortName} 网易云坏掉了`)
    return
  }

  const songsList = body?.result?.songs || []
  if (songsList.length === 0) {
    sendDanmu(`@${shortName} 无搜索结果`)
    return
  }

  const currOrderList = readFile(databaseName)

  if (currOrderList.length >= 10) {
    sendDanmu('歌单太多首啦，忍一会吧')
    return
  }

  if (currOrderList.filter(({ uid: listUid }) => uid === listUid).length >= 3) {
    sendDanmu(`@${shortName} 点了太多首啦`)
    return
  }

  const { id, name } = songsList[0]
  const existSong = currOrderList.find(({ id: listId }) => listId === id)
  if (existSong) {
    sendDanmu(`[${name}]已在列表中`)
    return
  }

  const rebuildParams = { level, uid, userName, brandName, id, name }
  localAddSong(rebuildParams)
  sendDanmu(`@${shortName} 点歌成功`)
}

function localAddSong(orderInfo) {
  try {
    writeWholeFile(
      databaseName,
      JSON.stringify(readFile(databaseName).concat([orderInfo])),
      (err) => {
        if (err) {
          console.error('error', err)
        }
      }
    )
  } catch (e) {}
}

const start = () => {
  connecting(global.ROOM_ID, (type, content) => {
    if (type !== 5 || !content) return
    try {
      const {
        msg,
        userInfo: { uid, userName, shortName },
        fanBrand: { level, brandName, brandNum },
      } = content

      if (cancelSong({ msg, shortName, uid })) {
        return
      }

      const orderSongName = getOrderSongName(msg)

      if (orderSongName) {
        if (brandNum !== global.ROOM_ID && !global.dev) {
          sendDanmu(`@${shortName} 粉丝牌可以点歌哦`)
          return
        } else {
          orderSong({
            shortName,
            level,
            uid,
            userName,
            brandName,
            orderSongName,
          })
        }
      }
    } catch (e) {}
  })
}

module.exports = {
  start,
}
