#define WIN32_LEAN_AND_MEAN
#include <Windows.h>
#include <array>
#include <chrono>
#include <cstdint>
#include <cstdlib>
#include <filesystem>
#include <fstream>
#include <system_error>
#include "main.h"

namespace {
namespace fs = std::filesystem;
using Clock = fs::file_time_type::clock;
using namespace std::chrono_literals;

// Preset order matches the Piik viewer's station picker.
constexpr std::array<const char*, 22> stations = {{
    "RADIO_OFF", "RADIO_01_CLASS_ROCK", "RADIO_02_POP", "RADIO_03_HIPHOP_NEW",
    "RADIO_04_PUNK", "RADIO_05_TALK_01", "RADIO_06_COUNTRY", "RADIO_07_DANCE_01",
    "RADIO_08_MEXICAN", "RADIO_09_HIPHOP_OLD", "RADIO_11_TALK_02", "RADIO_12_REGGAE",
    "RADIO_13_JAZZ", "RADIO_14_DANCE_02", "RADIO_15_MOTOWN", "RADIO_16_SILVERLAKE",
    "RADIO_17_FUNK", "RADIO_18_90S_ROCK", "RADIO_19_USER", "RADIO_20_THELAB", "RADIO_21_DLC_XM17", "RADIO_23_DLC_XM19_RADIO",
}};

template <typename... Args>
std::uint64_t call(std::uint64_t hash, Args... args) {
    nativeInit(hash);
    (nativePush64(static_cast<std::uint64_t>(args)), ...);
    const auto* result = nativeCall();
    return result ? *result : 0;
}

int driverVehicle() {
    // NETWORK_IS_SESSION_ACTIVE, PLAYER_PED_ID, GET_VEHICLE_PED_IS_IN,
    // and GET_PED_IN_VEHICLE_SEAT.
    if (call(0xD83C2B94E7508980) != 0) return 0;
    const auto player = static_cast<int>(call(0xD80958FC74E988A6));
    if (player == 0) return 0;
    const auto car = static_cast<int>(call(0x9A9112A0FE9A4713, player, false));
    if (car <= 0 || static_cast<int>(call(0xBB40DD2270B65366, car, -1, false)) != player) return 0;
    return car;
}

void update(const fs::path& path, int vehicle) {
    std::error_code ec;
    if (vehicle == 0) {
        fs::remove(path, ec);
        return;
    }
    const auto updated = fs::last_write_time(path, ec);
    if (!ec && Clock::now() - updated < 500ms && updated <= Clock::now()) {
        std::ifstream current(path);
        int lastVehicle = 0;
        if (current >> lastVehicle && lastVehicle == vehicle) return;
    }
    std::ofstream output(path, std::ios::trunc);
    output << vehicle << '\n';
}

void processRequest(const fs::path& path, int vehicle) {
    std::error_code ec;
    // Claim the file first so a newly published request cannot be deleted here.
    auto claimed = path;
    claimed += L".claimed";
    if (!MoveFileExW(path.c_str(), claimed.c_str(), MOVEFILE_REPLACE_EXISTING)) return;

    const auto updated = fs::last_write_time(claimed, ec);
    if (!ec && vehicle > 0 && fs::file_size(claimed, ec) <= 32) {
        const auto age = Clock::now() - updated;
        if (age >= 0ms && age <= 2s) {
            std::ifstream input(claimed);
            int intendedVehicle = 0;
            int station = -1;
            if (input >> intendedVehicle >> station && intendedVehicle == vehicle &&
                station >= 0 && static_cast<std::size_t>(station) < stations.size()) {
                // SET_VEH_RADIO_STATION.
                call(0x1B9C0099CB942AC6, vehicle, reinterpret_cast<std::uintptr_t>(stations[station]));
            }
        }
    }
    fs::remove(claimed, ec);
}

void scriptMain() {
    wchar_t localData[32768];
    const DWORD length = GetEnvironmentVariableW(L"LOCALAPPDATA", localData, 32768);
    if (length == 0 || length >= 32768) return;
    const auto dir = fs::path(localData) / L"Piik" / L"GtaRadio";
    const auto ready = dir / L"vehicle";
    const auto request = dir / L"request";
    std::error_code ec;
    fs::create_directories(dir, ec);
    if (ec) return;
    fs::remove(request, ec);
    for (;;) {
        const int vehicle = driverVehicle();
        update(ready, vehicle);
        processRequest(request, vehicle);
        scriptWait(150);
    }
}
}

BOOL WINAPI DllMain(HMODULE module, DWORD reason, LPVOID) {
    if (reason == DLL_PROCESS_ATTACH) {
        scriptRegister(module, scriptMain);
    } else if (reason == DLL_PROCESS_DETACH) {
        scriptUnregister(module);
    }
    return TRUE;
}
